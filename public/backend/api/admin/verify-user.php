<?php
/**
 * Admin Verify User API
 * Handles verification/denial of user verification requests
 * - Verify: sets user_type to 'host' and is_verified to 1
 * - Deny: keeps user_type as 'user' and sends rejection notification
 */

require_once __DIR__ . '/../../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : null;

if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit();
}

$token = $matches[1];
$input = json_decode(file_get_contents('php://input'), true);

include_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/jwt-helper.php';

try {
    $jwtHelper = new JWTHelper();
    $payload = $jwtHelper->validateToken($token);
    $adminId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Verify admin
    $stmt = $db->prepare("SELECT user_type FROM users WHERE id = :user_id");
    $stmt->execute(['user_id' => $adminId]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin || $admin['user_type'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit();
    }

    if (!isset($input['user_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        exit();
    }

    if (!isset($input['action']) || !in_array($input['action'], ['verify', 'deny'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Action must be either "verify" or "deny"']);
        exit();
    }

    $targetUserId = $input['user_id'];
    $action = $input['action'];

    // Get target user info for notification
    $userStmt = $db->prepare("SELECT first_name, last_name, email FROM users WHERE id = :user_id");
    $userStmt->execute(['user_id' => $targetUserId]);
    $targetUser = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    $notificationError = null;

    if ($action === 'verify') {
        // Verify: Set user_type to 'host' and is_verified to 1
        $updateStmt = $db->prepare("UPDATE users SET user_type = 'host', is_verified = 1, updated_at = NOW() WHERE id = :user_id");
        $result = $updateStmt->execute(['user_id' => $targetUserId]);
        
        if (!$result) {
            $errorInfo = $updateStmt->errorInfo();
            error_log('[VERIFY USER] Failed to update user on verify: ' . print_r($errorInfo, true));
            throw new Exception("Failed to update user: " . print_r($errorInfo, true));
        }
        
        $rowsAffected = $updateStmt->rowCount();
        if ($rowsAffected === 0) {
            error_log("[VERIFY USER] Warning: UPDATE affected 0 rows for user_id: {$targetUserId}");
            throw new Exception("No rows were updated. User may not exist or already has this status.");
        }
        
        error_log("[VERIFY USER] User verified successfully - user_id: {$targetUserId}, rows affected: {$rowsAffected}, user_type set to host");

        // Send success notification
        try {
            $notificationStmt = $db->prepare("
                INSERT INTO notifications (`from`, `to`, notification_type, title, message, is_read, created_at)
                VALUES (:from, :to, 'system', :title, :message, 0, NOW())
            ");
            $result = $notificationStmt->execute([
                ':from' => $adminId,
                ':to' => $targetUserId,
                ':title' => 'Verification Approved',
                ':message' => 'Congratulations! Your verification request has been approved. You are now a host and can create listings on Lebanon Locals.'
            ]);
            
            if (!$result) {
                $errorInfo = $notificationStmt->errorInfo();
                throw new Exception("Failed to insert notification: " . print_r($errorInfo, true));
            }
            
            error_log("[VERIFY USER] Notification created successfully - user_id: {$targetUserId}, admin_id: {$adminId}");
        } catch (Exception $e) {
            $notificationError = $e->getMessage();
            error_log('[VERIFY USER] Failed to create notification: ' . $e->getMessage());
        }

        echo json_encode([
            'success' => true,
            'message' => 'User verified successfully and set as host',
            'notification_error' => $notificationError
        ]);

    } else { // deny
        // Deny: Set user_type back to 'customer' (default user type) and ensure is_verified is 0
        $updateStmt = $db->prepare("UPDATE users SET user_type = 'customer', is_verified = 0, updated_at = NOW() WHERE id = :user_id");
        $result = $updateStmt->execute(['user_id' => $targetUserId]);
        
        if (!$result) {
            $errorInfo = $updateStmt->errorInfo();
            error_log('[VERIFY USER] Failed to update user on deny: ' . print_r($errorInfo, true));
            throw new Exception("Failed to update user: " . print_r($errorInfo, true));
        }
        
        $rowsAffected = $updateStmt->rowCount();
        if ($rowsAffected === 0) {
            error_log("[VERIFY USER] Warning: UPDATE affected 0 rows for user_id: {$targetUserId}");
            throw new Exception("No rows were updated. User may not exist or already has this status.");
        }
        
        error_log("[VERIFY USER] User denied successfully - user_id: {$targetUserId}, rows affected: {$rowsAffected}, user_type set to customer");
        
        // Send rejection notification
        try {
            $notificationStmt = $db->prepare("
                INSERT INTO notifications (`from`, `to`, notification_type, title, message, is_read, created_at)
                VALUES (:from, :to, 'system', :title, :message, 0, NOW())
            ");
            $result = $notificationStmt->execute([
                ':from' => $adminId,
                ':to' => $targetUserId,
                ':title' => 'Verification Request Denied',
                ':message' => 'Your verification request has been denied. You can re-apply whenever you are ready. Please ensure all your information and documents are complete.'
            ]);
            
            if (!$result) {
                $errorInfo = $notificationStmt->errorInfo();
                throw new Exception("Failed to insert notification: " . print_r($errorInfo, true));
            }
            
            error_log("[VERIFY USER] Notification created successfully - user_id: {$targetUserId}, admin_id: {$adminId}");
        } catch (Exception $e) {
            $notificationError = $e->getMessage();
            error_log('[VERIFY USER] Failed to create notification: ' . $e->getMessage());
        }

        echo json_encode([
            'success' => true,
            'message' => 'Verification request denied. User type set back to customer.',
            'notification_error' => $notificationError
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


<?php
/**
 * Change Password API
 * Updates user's password
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Include database
require_once __DIR__ . '/../config/database.php';

// Start session
session_start();

try {
    $database = new Database();
    $db = $database->getConnection();

    if ($db === null) {
        throw new Exception('Database connection failed');
    }

    // Get input
    $input = json_decode(file_get_contents('php://input'), true);

    // Get user ID from request body (sent by frontend) or session
    $user_id = isset($input['user_id']) ? intval($input['user_id']) : 
                (isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 1); // Development fallback

    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit();
    }
    
    error_log("[CHANGE PASSWORD] Changing password for user_id: $user_id");

    // Validate required fields
    if (empty($input['current_password']) || empty($input['new_password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Current password and new password are required']);
        exit();
    }

    // Get current password hash from database (correct field name: password_hash)
    $query = "SELECT password_hash FROM users WHERE id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    // Verify current password
    $passwordMatches = password_verify($input['current_password'], $user['password_hash']);
    error_log("[CHANGE PASSWORD] Password verification result: " . ($passwordMatches ? 'MATCH' : 'NO MATCH'));
    error_log("[CHANGE PASSWORD] Hash from DB: " . substr($user['password_hash'], 0, 30) . "...");
    
    if (!$passwordMatches) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
        exit();
    }

    // Hash new password
    $newPasswordHash = password_hash($input['new_password'], PASSWORD_DEFAULT);

    // Update password (correct field name: password_hash)
    $updateQuery = "UPDATE users 
                    SET password_hash = :password_hash,
                        updated_at = NOW()
                    WHERE id = :user_id";

    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindValue(':password_hash', $newPasswordHash, PDO::PARAM_STR);
    $updateStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $updateStmt->execute();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Password changed successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error changing password: ' . $e->getMessage()
    ]);
}
?>


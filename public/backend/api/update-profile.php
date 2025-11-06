<?php
/**
 * Update User Profile API
 * Updates user's basic information
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
    
    error_log("[UPDATE PROFILE] Updating profile for user_id: $user_id");

    // Validate required fields only if they're being updated
    if (isset($input['email'])) {
        // Check if email already exists for a different user
        $emailCheckQuery = "SELECT id FROM users WHERE email = :email AND id != :user_id";
        $emailCheckStmt = $db->prepare($emailCheckQuery);
        $emailCheckStmt->bindValue(':email', trim($input['email']), PDO::PARAM_STR);
        $emailCheckStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $emailCheckStmt->execute();
        
        if ($emailCheckStmt->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'This email is already in use by another account']);
            exit();
        }
    }

    // Build UPDATE query dynamically based on provided fields
    $updateFields = [];
    $params = [':user_id' => $user_id];
    
    // Always updateable fields
    $allowedFields = [
        'first_name', 'last_name', 'email', 'phone_number', 
        'nationality', 'bio', 'languages_spoken',
        'emergency_contact_name', 'emergency_contact_phone',
        'gender', 'date_of_birth', 'age'
    ];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateFields[] = "$field = :$field";
            $params[":$field"] = trim($input[$field]);
        }
    }
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }
    
    $updateFields[] = "updated_at = NOW()";
    
    $query = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = :user_id";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating profile: ' . $e->getMessage()
    ]);
}
?>


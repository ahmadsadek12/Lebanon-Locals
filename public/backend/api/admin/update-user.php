<?php
/**
 * Admin Update User API
 */

require_once __DIR__ . '/../../config/cors.php';
setCorsHeaders();
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
    $userId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Verify admin
    $stmt = $db->prepare("SELECT user_type FROM users WHERE id = :user_id");
    $stmt->execute(['user_id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || $user['user_type'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit();
    }

    // Validate input
    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        exit();
    }

    // Build dynamic UPDATE query based on provided fields
    $allowedFields = [
        'first_name', 'last_name', 'email', 'user_type', 'is_verified', 'is_active',
        'gender', 'date_of_birth', 'age', 'nationality', 'phone_number',
        'emergency_contact_name', 'emergency_contact_phone', 'credits',
        'user_ranking', 'total_reviews', 'years_hosting', 'bio', 'languages_spoken',
        'address_id', 'profile_picture', 'id_passport_picture'
    ];
    
    $updateFields = [];
    $updateParams = ['id' => $input['id']];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            // Allow empty strings to clear fields
            $updateFields[] = "$field = :$field";
            $updateParams[$field] = $input[$field] === '' ? null : $input[$field];
        }
    }
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No valid fields to update']);
        exit();
    }
    
    // Always update updated_at timestamp
    $updateFields[] = "updated_at = NOW()";
    
    $updateQuery = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = :id";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->execute($updateParams);

    echo json_encode([
        'success' => true,
        'message' => 'User updated successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


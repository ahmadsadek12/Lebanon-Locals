<?php
/**
 * Admin Update Stay API
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

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Stay ID is required']);
        exit();
    }

    // Build dynamic UPDATE query based on provided fields
    $allowedFields = [
        'title', 'description', 'location', 'price_per_night', 'main_image',
        'max_guests', 'number_of_bedrooms', 'number_of_beds', 
        'number_double_beds', 'number_single_beds', 'number_bunk_beds',
        'number_of_bathrooms', 'property_type', 'cancellation_policy',
        'house_rules', 'instant_book', 'check_in_time', 'check_out_time',
        'cash_enabled', 'is_active', 'service_fee_percentage',
        'min_nights', 'max_nights'
    ];
    
    $updateFields = [];
    $updateParams = ['id' => $input['id']];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            // Allow empty strings to clear fields (except required ones)
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
    
    $updateQuery = "UPDATE stays SET " . implode(', ', $updateFields) . " WHERE id = :id";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->execute($updateParams);

    echo json_encode(['success' => true, 'message' => 'Stay updated successfully']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


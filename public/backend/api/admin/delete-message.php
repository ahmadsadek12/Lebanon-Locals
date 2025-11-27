<?php
/**
 * Admin Delete Message API
 */

header('Access-Control-Allow-Origin: *');
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
        echo json_encode(['success' => false, 'message' => 'Message ID is required']);
        exit();
    }

    // Delete message
    $deleteStmt = $db->prepare("DELETE FROM messages WHERE id = :id");
    $deleteStmt->execute(['id' => $input['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Message deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

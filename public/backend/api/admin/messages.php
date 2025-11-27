<?php
/**
 * Admin Messages API - Get All Messages
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET');
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

    // Get all messages with sender and receiver names
    $stmt = $db->query("
        SELECT
            m.id,
            m.sender_id,
            m.receiver_id,
            m.booking_id,
            m.subject,
            m.message_text,
            m.is_read,
            m.read_at,
            m.created_at,
            CONCAT(sender.first_name, ' ', sender.last_name) as sender_name,
            sender.email as sender_email,
            CONCAT(receiver.first_name, ' ', receiver.last_name) as receiver_name,
            receiver.email as receiver_email
        FROM messages m
        LEFT JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users receiver ON m.receiver_id = receiver.id
        ORDER BY m.created_at DESC
    ");
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $messages,
        'count' => count($messages)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

<?php
/**
 * Admin Notifications API - Get All Notifications
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

    // Verify admin (user_id from JWT payload, not from notifications table)
    $stmt = $db->prepare("SELECT user_type FROM users WHERE id = :user_id");
    $stmt->execute([':user_id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || $user['user_type'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit();
    }

    // Get all notifications with user info
    $stmt = $db->query("
        SELECT
            n.id,
            n.`from`,
            n.`to`,
            n.notification_type,
            n.title,
            n.message,
            n.related_id,
            n.is_read,
            n.read_at,
            n.created_at,
            CONCAT(u_from.first_name, ' ', u_from.last_name) as from_user_name,
            u_from.email as from_user_email,
            CONCAT(u_to.first_name, ' ', u_to.last_name) as to_user_name,
            u_to.email as to_user_email
        FROM notifications n
        LEFT JOIN users u_from ON n.`from` = u_from.id
        LEFT JOIN users u_to ON n.`to` = u_to.id
        ORDER BY n.created_at DESC
    ");
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $notifications,
        'count' => count($notifications)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

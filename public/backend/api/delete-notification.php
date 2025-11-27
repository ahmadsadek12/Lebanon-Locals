<?php
/**
 * Delete Notification API
 * Deletes a notification for the authenticated user (verifies ownership via 'to' column)
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt-helper.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Get JWT token from Authorization header
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : null;

if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

$token = $matches[1];
$notificationId = isset($input['notification_id']) ? intval($input['notification_id']) : null;

if (!$notificationId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Notification ID is required']);
    exit();
}

try {
    $jwtHelper = new JWTHelper();
    $payload = $jwtHelper->validateToken($token);
    $userId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Verify notification belongs to user using 'to' column
    $verifyQuery = "SELECT `to` FROM notifications WHERE id = :notification_id";
    $verifyStmt = $db->prepare($verifyQuery);
    $verifyStmt->bindParam(':notification_id', $notificationId, PDO::PARAM_INT);
    $verifyStmt->execute();
    $notification = $verifyStmt->fetch(PDO::FETCH_ASSOC);

    if (!$notification) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Notification not found']);
        exit();
    }

    if ((int)$notification['to'] !== (int)$userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You do not have permission to delete this notification']);
        exit();
    }

    // Delete the notification
    $deleteQuery = "DELETE FROM notifications WHERE id = :notification_id";
    $deleteStmt = $db->prepare($deleteQuery);
    $deleteStmt->bindParam(':notification_id', $notificationId, PDO::PARAM_INT);
    $deleteStmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Notification deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>


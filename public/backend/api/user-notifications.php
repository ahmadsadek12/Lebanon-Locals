<?php
/**
 * User Notifications API
 * Returns notifications for the authenticated user
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt-helper.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get JWT token from Authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : null;
    
    if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        // Try to get from query parameter as fallback
        $token = isset($_GET['token']) ? $_GET['token'] : null;
    } else {
        $token = $matches[1];
    }

    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit();
    }

    $jwtHelper = new JWTHelper();
    $payload = $jwtHelper->validateToken($token);
    $userId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Check if only unread notifications
    $unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';

    // Return all notifications for this user using 'to' column (host, admin, or guest)
    $query = "SELECT 
                id,
                `from`,
                `to`,
                notification_type,
                title,
                message,
                related_id,
                is_read,
                read_at,
                created_at
              FROM notifications
              WHERE `to` = :user_id";

    if ($unreadOnly) {
        $query .= " AND is_read = 0";
    }

    $query .= " ORDER BY created_at DESC LIMIT 50";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();

    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Unread count
    $countQuery = "SELECT COUNT(*) as unread_count 
                   FROM notifications 
                   WHERE `to` = :user_id AND is_read = 0";
    $countStmt = $db->prepare($countQuery);
    $countStmt->bindParam(':user_id', $userId);
    $countStmt->execute();
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $unreadCount = intval($countResult['unread_count']);

    echo json_encode([
        'success' => true,
        'count' => count($notifications),
        'unread_count' => $unreadCount,
        'notifications' => $notifications
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log('[NOTIFICATIONS API] Error: ' . $e->getMessage());
    error_log('[NOTIFICATIONS API] Trace: ' . $e->getTraceAsString());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_details' => 'Check server logs for details'
    ]);
}
?>


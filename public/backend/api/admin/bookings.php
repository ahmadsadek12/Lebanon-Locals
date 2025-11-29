<?php
/**
 * Admin Bookings API - Get All Bookings
 */

require_once __DIR__ . '/../../config/cors.php';
setCorsHeaders();
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

    // Get all bookings
    $query = "SELECT b.*,
                     CONCAT(u.first_name, ' ', u.last_name) as guest_name,
                     u.email as guest_email,
                     CASE
                        WHEN b.listing_type = 'experience' THEN e.title
                        WHEN b.listing_type = 'event' THEN ev.title
                        WHEN b.listing_type = 'stay' THEN s.title
                     END as listing_title
              FROM bookings b
              LEFT JOIN users u ON b.user_id = u.id
              LEFT JOIN hostings e ON b.listing_type = 'experience' AND b.listing_id = e.id
              LEFT JOIN hostings ev ON b.listing_type = 'event' AND b.listing_id = ev.id
              LEFT JOIN stays s ON b.listing_type = 'stay' AND b.listing_id = s.id
              ORDER BY b.created_at DESC";

    $stmt = $db->query($query);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $bookings,
        'count' => count($bookings)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


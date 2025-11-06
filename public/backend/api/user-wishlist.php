<?php
/**
 * Get User Wishlist API
 * Requires JWT token in Authorization header
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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

// Get Authorization header
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : null;

if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit();
}

$token = $matches[1];

// Database connection
include_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt-helper.php';

try {
    // Validate token and get user ID
    $jwtHelper = new JWTHelper();
    $payload = $jwtHelper->validateToken($token);
    $userId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Get wishlist items
    $query = "SELECT w.*,
                     CASE
                        WHEN w.item_type = 'hosting' THEN h.title
                        WHEN w.item_type = 'stay' THEN s.title
                     END as item_title,
                     CASE
                        WHEN w.item_type = 'hosting' THEN h.main_image
                        WHEN w.item_type = 'stay' THEN s.main_image
                     END as item_image,
                     CASE
                        WHEN w.item_type = 'hosting' THEN h.location
                        WHEN w.item_type = 'stay' THEN s.location
                     END as item_location,
                     CASE
                        WHEN w.item_type = 'hosting' THEN h.price_per_person
                        WHEN w.item_type = 'stay' THEN s.price_per_night
                     END as item_price
              FROM wishlists w
              LEFT JOIN hostings h ON w.item_type = 'hosting' AND w.item_id = h.id
              LEFT JOIN stays s ON w.item_type = 'stay' AND w.item_id = s.id
              WHERE w.user_id = :user_id
              ORDER BY w.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();

    $wishlist = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'wishlist' => $wishlist,
        'count' => count($wishlist)
    ]);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Authentication error: ' . $e->getMessage()
    ]);
}

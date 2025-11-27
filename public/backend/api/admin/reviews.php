<?php
/**
 * Admin Reviews API - Get All Reviews
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

    // Get all reviews with reviewer info
    $query = "SELECT r.*,
                     CONCAT(u.first_name, ' ', u.last_name) as reviewer_name,
                     CASE
                        WHEN r.reviewee_type = 'hosting' THEN h.title
                        WHEN r.reviewee_type = 'stay' THEN s.title
                     END as listing_title
              FROM reviews r
              LEFT JOIN users u ON r.reviewer_id = u.id
              LEFT JOIN hostings h ON r.reviewee_type = 'hosting' AND r.reviewee_id = h.id
              LEFT JOIN stays s ON r.reviewee_type = 'stay' AND r.reviewee_id = s.id
              ORDER BY r.created_at DESC";

    $stmt = $db->query($query);
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $reviews,
        'count' => count($reviews)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


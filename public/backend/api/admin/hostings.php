<?php
/**
 * Admin Hostings API - Get Experiences/Events
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

    $type = isset($_GET['type']) ? $_GET['type'] : 'experience';

    // Get hostings with host info and ratings
    $query = "SELECT h.*,
                     CONCAT(u.first_name, ' ', u.last_name) as host_name,
                     u.email as host_email,
                     COALESCE(r.avg_rating, 0) AS average_rating,
                     COALESCE(r.review_count, 0) AS total_reviews
              FROM hostings h
              LEFT JOIN users u ON h.host_id = u.id
              LEFT JOIN (
                  SELECT reviewee_id,
                         AVG(stars) AS avg_rating,
                         COUNT(*) AS review_count
                  FROM reviews
                  WHERE reviewee_type = 'hosting'
                  GROUP BY reviewee_id
              ) r ON r.reviewee_id = h.id
              WHERE h.hosting_type = :type
              ORDER BY h.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->execute(['type' => $type]);
    $hostings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $hostings,
        'count' => count($hostings)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


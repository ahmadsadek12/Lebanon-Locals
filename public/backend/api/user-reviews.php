<?php
/**
 * User Reviews API
 * Get reviews left about a user (as a guest)
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Include database
require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    if ($db === null) {
        throw new Exception('Database connection failed');
    }

    // Get user ID from query parameter
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id is required']);
        exit();
    }

    // Get reviews where this user is the reviewee (reviews about them)
    $query = "SELECT 
                r.id,
                r.stars,
                r.review_text as comments,
                r.created_at,
                CONCAT(reviewer.first_name, ' ', reviewer.last_name) as reviewer_name,
                reviewer.profile_picture as reviewer_picture
              FROM reviews r
              LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
              WHERE r.reviewee_id = :user_id
                AND r.reviewee_type = 'user'
                AND r.is_visible = 1
              ORDER BY r.created_at DESC
              LIMIT 20";

    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();

    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'count' => count($reviews),
        'data' => $reviews
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching reviews: ' . $e->getMessage()
    ]);
}
?>


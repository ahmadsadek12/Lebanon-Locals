<?php
/**
 * Lebanon Locals - Reviews API Endpoint
 * GET /api/reviews.php
 *
 * @version 1.0.0
 */

// Enable error reporting
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

// Include database connection
$dbFile = __DIR__ . '/../config/database.php';

if (!file_exists($dbFile)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database config file not found'
    ]);
    exit();
}

include_once $dbFile;

// Instantiate database
$database = new Database();
$db = $database->getConnection();

// Check connection
if ($db === null) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

try {
    // Get parameters
    $revieweeType = isset($_GET['reviewee_type']) ? trim($_GET['reviewee_type']) : null;
    $revieweeId = isset($_GET['reviewee_id']) ? intval($_GET['reviewee_id']) : null;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

    // Validate required parameters
    if (!$revieweeType || !$revieweeId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'reviewee_type and reviewee_id are required'
        ]);
        exit();
    }

    // Validate reviewee_type
    $validTypes = ['hosting', 'stay', 'user'];
    if (!in_array($revieweeType, $validTypes)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid reviewee_type. Must be: hosting, stay, or user'
        ]);
        exit();
    }

    // Get total count and average ratings
    $statsStmt = $db->prepare("
        SELECT
            COUNT(*) as total_reviews,
            COALESCE(AVG(stars), 0) as average_rating,
            COALESCE(AVG(cleanliness_rating), 0) as avg_cleanliness,
            COALESCE(AVG(communication_rating), 0) as avg_communication,
            COALESCE(AVG(accuracy_rating), 0) as avg_accuracy,
            COALESCE(AVG(location_rating), 0) as avg_location,
            COALESCE(AVG(value_rating), 0) as avg_value,
            SUM(CASE WHEN stars >= 4.5 THEN 1 ELSE 0 END) as five_star_count,
            SUM(CASE WHEN stars >= 3.5 AND stars < 4.5 THEN 1 ELSE 0 END) as four_star_count,
            SUM(CASE WHEN stars >= 2.5 AND stars < 3.5 THEN 1 ELSE 0 END) as three_star_count,
            SUM(CASE WHEN stars >= 1.5 AND stars < 2.5 THEN 1 ELSE 0 END) as two_star_count,
            SUM(CASE WHEN stars < 1.5 THEN 1 ELSE 0 END) as one_star_count
        FROM reviews
        WHERE reviewee_type = :reviewee_type
        AND reviewee_id = :reviewee_id
        AND is_visible = 1
    ");

    $statsStmt->execute([
        'reviewee_type' => $revieweeType,
        'reviewee_id' => $revieweeId
    ]);

    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // Get reviews with reviewer information
    $reviewsStmt = $db->prepare("
        SELECT
            r.id,
            r.reviewer_id,
            r.stars,
            r.review_text,
            r.cleanliness_rating,
            r.communication_rating,
            r.accuracy_rating,
            r.location_rating,
            r.value_rating,
            r.is_verified_booking,
            r.host_response,
            r.host_response_date,
            r.created_at,
            u.first_name as reviewer_first_name,
            u.last_name as reviewer_last_name,
            u.profile_picture as reviewer_picture,
            u.user_ranking as reviewer_ranking,
            u.created_at as reviewer_member_since
        FROM reviews r
        JOIN users u ON r.reviewer_id = u.id
        WHERE r.reviewee_type = :reviewee_type
        AND r.reviewee_id = :reviewee_id
        AND r.is_visible = 1
        ORDER BY r.created_at DESC
        LIMIT :limit OFFSET :offset
    ");

    $reviewsStmt->bindValue(':reviewee_type', $revieweeType, PDO::PARAM_STR);
    $reviewsStmt->bindValue(':reviewee_id', $revieweeId, PDO::PARAM_INT);
    $reviewsStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $reviewsStmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $reviewsStmt->execute();
    $reviews = $reviewsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the reviews
    $formattedReviews = array_map(function($review) {
        return [
            'id' => (int)$review['id'],
            'reviewer' => [
                'id' => (int)$review['reviewer_id'],
                'first_name' => $review['reviewer_first_name'],
                'last_name' => $review['reviewer_last_name'],
                'picture' => $review['reviewer_picture'],
                'ranking' => $review['reviewer_ranking'] ? (float)$review['reviewer_ranking'] : null,
                'member_since' => $review['reviewer_member_since']
            ],
            'stars' => (float)$review['stars'],
            'review_text' => $review['review_text'],
            'ratings' => [
                'cleanliness' => $review['cleanliness_rating'] ? (float)$review['cleanliness_rating'] : null,
                'communication' => $review['communication_rating'] ? (float)$review['communication_rating'] : null,
                'accuracy' => $review['accuracy_rating'] ? (float)$review['accuracy_rating'] : null,
                'location' => $review['location_rating'] ? (float)$review['location_rating'] : null,
                'value' => $review['value_rating'] ? (float)$review['value_rating'] : null
            ],
            'is_verified_booking' => (bool)$review['is_verified_booking'],
            'host_response' => $review['host_response'],
            'host_response_date' => $review['host_response_date'],
            'created_at' => $review['created_at']
        ];
    }, $reviews);

    // Prepare response
    $response = [
        'success' => true,
        'data' => [
            'stats' => [
                'total_reviews' => (int)$stats['total_reviews'],
                'average_rating' => round((float)$stats['average_rating'], 2),
                'rating_breakdown' => [
                    'cleanliness' => round((float)$stats['avg_cleanliness'], 2),
                    'communication' => round((float)$stats['avg_communication'], 2),
                    'accuracy' => round((float)$stats['avg_accuracy'], 2),
                    'location' => round((float)$stats['avg_location'], 2),
                    'value' => round((float)$stats['avg_value'], 2)
                ],
                'star_distribution' => [
                    '5' => (int)($stats['five_star_count'] ?? 0),
                    '4' => (int)($stats['four_star_count'] ?? 0),
                    '3' => (int)($stats['three_star_count'] ?? 0),
                    '2' => (int)($stats['two_star_count'] ?? 0),
                    '1' => (int)($stats['one_star_count'] ?? 0)
                ]
            ],
            'reviews' => $formattedReviews,
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => (int)$stats['total_reviews']
            ]
        ]
    ];

    http_response_code(200);
    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    error_log("Reviews API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while fetching reviews'
    ]);
}
?>

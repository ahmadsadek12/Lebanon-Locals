<?php
/**
 * Check if Booking Has Been Reviewed API
 * Checks if the current user has already submitted a review for a specific booking
 * Requires JWT token in Authorization header
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

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

// Get booking_id from query parameter
$bookingId = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : null;

if (!$bookingId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'booking_id is required']);
    exit();
}

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

    // Check if user has reviewed this booking
    $stmt = $db->prepare("
        SELECT id, stars, review_text, created_at
        FROM reviews 
        WHERE booking_id = :booking_id 
        AND reviewer_id = :reviewer_id
        LIMIT 1
    ");

    $stmt->execute([
        'booking_id' => $bookingId,
        'reviewer_id' => $userId
    ]);

    $review = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($review) {
        echo json_encode([
            'success' => true,
            'has_review' => true,
            'review' => [
                'id' => (int)$review['id'],
                'stars' => (float)$review['stars'],
                'review_text' => $review['review_text'],
                'created_at' => $review['created_at']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'has_review' => false
        ]);
    }

} catch (Exception $e) {
    error_log("Check Review Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
?>


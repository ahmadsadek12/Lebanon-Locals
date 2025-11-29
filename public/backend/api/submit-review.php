<?php
/**
 * Submit Review API
 * Allows users to submit reviews for completed bookings
 * Requires JWT token in Authorization header
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

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

    // Validate required fields
    if (!isset($input['booking_id']) || !isset($input['stars']) || !isset($input['review_text'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: booking_id, stars, review_text']);
        exit();
    }

    $bookingId = intval($input['booking_id']);
    $stars = floatval($input['stars']);
    $reviewText = trim($input['review_text']);

    // Validate star rating
    if ($stars < 1 || $stars > 5) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Star rating must be between 1 and 5']);
        exit();
    }

    // Verify booking exists and belongs to user
    $stmt = $db->prepare("SELECT * FROM bookings WHERE id = :booking_id AND user_id = :user_id");
    $stmt->execute(['booking_id' => $bookingId, 'user_id' => $userId]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Booking not found or does not belong to you']);
        exit();
    }

    // Check if booking is completed or past
    $endDate = strtotime($booking['end_date']);
    $today = strtotime('today');
    
    // Check both status fields (some bookings use 'status', others use 'booking_status')
    $bookingStatus = isset($booking['booking_status']) ? $booking['booking_status'] : $booking['status'];
    
    if ($endDate >= $today && !in_array($bookingStatus, ['cancelled', 'completed'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Can only review past or completed bookings']);
        exit();
    }

    // Check if user has already reviewed this booking
    $checkStmt = $db->prepare("SELECT id FROM reviews WHERE booking_id = :booking_id AND reviewer_id = :reviewer_id");
    $checkStmt->execute(['booking_id' => $bookingId, 'reviewer_id' => $userId]);
    
    if ($checkStmt->fetch()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'You have already reviewed this booking']);
        exit();
    }

    // Get host/listing information for reviewee
    // Map listing_type to reviewee_type enum values
    $listingType = $booking['listing_type']; // 'experience', 'event', or 'stay'
    $revieweeType = ($listingType === 'experience' || $listingType === 'event') ? 'hosting' : 'stay';
    $revieweeId = $booking['listing_id'];
    
    // Get host ID based on listing type
    $hostId = null;
    if ($revieweeType === 'stay') {
        $hostStmt = $db->prepare("SELECT host_id FROM stays WHERE id = :id");
    } else {
        $hostStmt = $db->prepare("SELECT host_id FROM hostings WHERE id = :id");
    }
    $hostStmt->execute(['id' => $revieweeId]);
    $hostData = $hostStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($hostData) {
        $hostId = $hostData['host_id'];
    }

    // Get optional detailed ratings
    $cleanlinessRating = isset($input['cleanliness_rating']) ? floatval($input['cleanliness_rating']) : null;
    $communicationRating = isset($input['communication_rating']) ? floatval($input['communication_rating']) : null;
    $accuracyRating = isset($input['accuracy_rating']) ? floatval($input['accuracy_rating']) : null;
    $locationRating = isset($input['location_rating']) ? floatval($input['location_rating']) : null;
    $valueRating = isset($input['value_rating']) ? floatval($input['value_rating']) : null;

    // Insert review
    $insertStmt = $db->prepare("
        INSERT INTO reviews (
            reviewer_id, 
            reviewee_type, 
            reviewee_id,
            booking_id,
            stars, 
            review_text,
            cleanliness_rating,
            communication_rating,
            accuracy_rating,
            location_rating,
            value_rating,
            is_verified_booking,
            is_visible,
            created_at
        ) VALUES (
            :reviewer_id,
            :reviewee_type,
            :reviewee_id,
            :booking_id,
            :stars,
            :review_text,
            :cleanliness_rating,
            :communication_rating,
            :accuracy_rating,
            :location_rating,
            :value_rating,
            1,
            1,
            NOW()
        )
    ");

    $insertStmt->execute([
        'reviewer_id' => $userId,
        'reviewee_type' => $revieweeType,
        'reviewee_id' => $revieweeId,
        'booking_id' => $bookingId,
        'stars' => $stars,
        'review_text' => $reviewText,
        'cleanliness_rating' => $cleanlinessRating,
        'communication_rating' => $communicationRating,
        'accuracy_rating' => $accuracyRating,
        'location_rating' => $locationRating,
        'value_rating' => $valueRating
    ]);

    $reviewId = $db->lastInsertId();

    // Update listing's average rating (for experiences/events/stays)
    try {
        if ($revieweeType === 'stay') {
            $updateStmt = $db->prepare("
                UPDATE stays 
                SET average_rating = (SELECT COALESCE(AVG(stars), 0) FROM reviews WHERE reviewee_type = 'stay' AND reviewee_id = :reviewee_id AND is_visible = 1),
                    total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_type = 'stay' AND reviewee_id = :reviewee_id AND is_visible = 1)
                WHERE id = :reviewee_id
            ");
            $updateStmt->execute(['reviewee_id' => $revieweeId]);
        } else {
            // For experiences and events (both use 'hosting' type)
            $updateStmt = $db->prepare("
                UPDATE hostings 
                SET average_rating = (SELECT COALESCE(AVG(stars), 0) FROM reviews WHERE reviewee_type = 'hosting' AND reviewee_id = :reviewee_id AND is_visible = 1),
                    total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_type = 'hosting' AND reviewee_id = :reviewee_id AND is_visible = 1)
                WHERE id = :reviewee_id
            ");
            $updateStmt->execute(['reviewee_id' => $revieweeId]);
        }
    } catch (PDOException $e) {
        error_log("Warning: Could not update listing rating: " . $e->getMessage());
        // Don't fail the review submission
    }

    // Update host's overall rating if we have host_id
    if ($hostId) {
        try {
            // Calculate host average from all their listings' reviews
            $hostStatsStmt = $db->prepare("
                SELECT 
                    AVG(r.stars) as avg_rating,
                    COUNT(r.id) as total_reviews
                FROM reviews r
                WHERE (
                    (r.reviewee_type IN ('experience', 'event') AND r.reviewee_id IN (SELECT id FROM hostings WHERE host_id = :host_id))
                    OR
                    (r.reviewee_type = 'stay' AND r.reviewee_id IN (SELECT id FROM stays WHERE host_id = :host_id))
                ) AND r.is_visible = 1
            ");
            $hostStatsStmt->execute(['host_id' => $hostId]);
            $hostStats = $hostStatsStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($hostStats) {
                $hostUpdateStmt = $db->prepare("
                    UPDATE users 
                    SET user_ranking = :avg_rating,
                        total_reviews = :total_reviews
                    WHERE id = :host_id
                ");
                $hostUpdateStmt->execute([
                    'avg_rating' => $hostStats['avg_rating'],
                    'total_reviews' => $hostStats['total_reviews'],
                    'host_id' => $hostId
                ]);
            }
        } catch (PDOException $e) {
            // Log error but don't fail the review submission
            error_log("Warning: Could not update host rating: " . $e->getMessage());
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Review submitted successfully',
        'review_id' => $reviewId
    ]);

} catch (PDOException $e) {
    error_log("Submit Review PDO Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error while submitting review: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Submit Review Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while submitting the review: ' . $e->getMessage()
    ]);
}
?>


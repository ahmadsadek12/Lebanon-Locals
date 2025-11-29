<?php
/**
 * Get User Bookings API
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

// Get query parameters
$status = isset($_GET['status']) ? $_GET['status'] : 'all'; // upcoming, previous, all

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

    // Base query
    $query = "SELECT b.*,
                     CASE
                        WHEN b.listing_type = 'experience' THEN e.title
                        WHEN b.listing_type = 'event' THEN ev.title
                        WHEN b.listing_type = 'stay' THEN s.title
                     END as listing_title,
                     CASE
                        WHEN b.listing_type = 'experience' THEN e.main_image
                        WHEN b.listing_type = 'event' THEN ev.main_image
                        WHEN b.listing_type = 'stay' THEN s.main_image
                     END as listing_image
              FROM bookings b
              LEFT JOIN hostings e ON b.listing_type = 'experience' AND b.listing_id = e.id
              LEFT JOIN hostings ev ON b.listing_type = 'event' AND b.listing_id = ev.id
              LEFT JOIN stays s ON b.listing_type = 'stay' AND b.listing_id = s.id
              WHERE b.user_id = :user_id";

    // Add status filter (using booking_status column)
    if ($status === 'upcoming') {
        $query .= " AND b.end_date >= CURDATE() AND (b.booking_status IN ('confirmed', 'pending') OR b.status IN ('confirmed', 'pending'))";
    } elseif ($status === 'previous') {
        $query .= " AND (b.end_date < CURDATE() OR b.booking_status IN ('cancelled', 'completed') OR b.status IN ('cancelled', 'completed'))";
    }

    $query .= " ORDER BY b.start_date DESC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();

    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Categorize bookings
    $upcoming = [];
    $previous = [];

    foreach ($bookings as $booking) {
        // Check both status and booking_status fields
        $bookingStatus = isset($booking['booking_status']) ? $booking['booking_status'] : $booking['status'];
        $isUpcoming = (strtotime($booking['end_date']) >= strtotime('today')) &&
                      in_array($bookingStatus, ['confirmed', 'pending']);

        if ($isUpcoming) {
            $upcoming[] = $booking;
        } else {
            $previous[] = $booking;
        }
    }

    echo json_encode([
        'success' => true,
        'bookings' => [
            'upcoming' => $upcoming,
            'previous' => $previous,
            'all' => $bookings
        ],
        'count' => [
            'upcoming' => count($upcoming),
            'previous' => count($previous),
            'total' => count($bookings)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Authentication error: ' . $e->getMessage()
    ]);
}

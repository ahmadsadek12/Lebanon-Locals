<?php
/**
 * Get Booking Details API
 * Fetches a single booking with listing information
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

    // Get booking ID from query parameter
    $booking_id = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : 0;

    if (!$booking_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'booking_id is required']);
        exit();
    }

    // Get booking with listing details
    $query = "SELECT 
                b.*,
                CASE 
                    WHEN b.listing_type = 'stay' THEN s.title
                    WHEN b.listing_type IN ('experience', 'event') THEN h.title
                END as listing_title,
                CASE 
                    WHEN b.listing_type = 'stay' THEN s.location
                    WHEN b.listing_type IN ('experience', 'event') THEN h.location
                END as listing_location,
                CASE 
                    WHEN b.listing_type = 'stay' THEN si.image
                    WHEN b.listing_type IN ('experience', 'event') THEN hi.image
                END as listing_image
              FROM bookings b
              LEFT JOIN stays s ON b.listing_type = 'stay' AND b.listing_id = s.id
              LEFT JOIN hostings h ON b.listing_type IN ('experience', 'event') AND b.listing_id = h.id
              LEFT JOIN (
                  SELECT stay_id, MIN(image) as image
                  FROM stay_images 
                  WHERE is_primary = 1 
                  GROUP BY stay_id
              ) si ON s.id = si.stay_id
              LEFT JOIN (
                  SELECT hosting_id, MIN(image) as image
                  FROM hosting_images 
                  WHERE is_primary = 1 
                  GROUP BY hosting_id
              ) hi ON h.id = hi.hosting_id
              WHERE b.id = :booking_id
              LIMIT 1";

    $stmt = $db->prepare($query);
    $stmt->bindValue(':booking_id', $booking_id, PDO::PARAM_INT);
    $stmt->execute();

    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Booking not found']);
        exit();
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $booking
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching booking: ' . $e->getMessage()
    ]);
}
?>


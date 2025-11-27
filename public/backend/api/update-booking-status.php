<?php
/**
 * Update Booking Status API
 * Allows hosts to accept or reject pending bookings
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Get user_id from request
$userId = isset($input['user_id']) ? intval($input['user_id']) : null;
$bookingId = isset($input['booking_id']) ? intval($input['booking_id']) : null;
$action = isset($input['action']) ? trim($input['action']) : null;

if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'User authentication required']);
    exit();
}

if (!$bookingId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Booking ID is required']);
    exit();
}

if (!$action || !in_array($action, ['accept', 'reject'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action. Must be "accept" or "reject"']);
    exit();
}

// Optional debug info for notifications
$notificationsError = null;

try {
    $database = new Database();
    $db = $database->getConnection();

    // Get booking details and verify host ownership
    $bookingQuery = "SELECT 
                        b.id,
                        b.host_id,
                        b.user_id,
                        b.listing_type,
                        b.listing_id,
                        b.status,
                        b.booking_status
                     FROM bookings b
                     WHERE b.id = :booking_id
                     LIMIT 1";
    
    $bookingStmt = $db->prepare($bookingQuery);
    $bookingStmt->bindParam(':booking_id', $bookingId);
    $bookingStmt->execute();
    $booking = $bookingStmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Booking not found']);
        exit();
    }

    // Verify host owns this booking
    if ($booking['host_id'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You do not have permission to modify this booking']);
        exit();
    }

    // Determine new status
    if ($action === 'accept') {
        $newStatus = 'confirmed';
        $newBookingStatus = 'confirmed';
    } else {
        $newStatus = 'cancelled';
        $newBookingStatus = 'cancelled';
    }

    // Update booking status
    $updateQuery = "UPDATE bookings 
                    SET status = :status,
                        booking_status = :booking_status
                    WHERE id = :booking_id";
    
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindParam(':status', $newStatus);
    $updateStmt->bindParam(':booking_status', $newBookingStatus);
    $updateStmt->bindParam(':booking_id', $bookingId);

    if (!$updateStmt->execute()) {
        throw new Exception('Failed to update booking status');
    }

    // Notify the guest about the status update using main `notifications` table
    // Using 'from' (host) and 'to' (guest) columns
    try {
        $listingTitle = getListingTitle($db, $booking['listing_type'], $booking['listing_id']);
        $notificationTitle = $action === 'accept'
            ? 'Booking accepted'
            : 'Booking cancelled';
        $notificationMessage = $action === 'accept'
            ? "Your booking for \"{$listingTitle}\" was accepted."
            : "Your booking for \"{$listingTitle}\" was cancelled.";

        $notifStmt = $db->prepare("
            INSERT INTO notifications (`from`, `to`, title, message, related_id, is_read, created_at)
            VALUES (:from, :to, :title, :message, :related_id, 0, NOW())
        ");
        $notifStmt->execute([
            ':from'       => $userId, // Host who accepted/rejected
            ':to'         => $booking['user_id'], // Guest who booked
            ':title'      => $notificationTitle,
            ':message'    => $notificationMessage,
            ':related_id' => $bookingId,
        ]);
    } catch (Exception $e) {
        $notificationsError = $e->getMessage();
        error_log('[BOOKING STATUS] Failed to create booking_update notification: ' . $e->getMessage());
    }

    $response = [
        'success' => true,
        'message' => $action === 'accept' ? 'Booking accepted successfully' : 'Booking rejected successfully',
        'booking_id' => $bookingId,
        'status' => $newStatus,
        'booking_status' => $newBookingStatus
    ];

    if ($notificationsError !== null) {
        $response['notifications_error'] = $notificationsError;
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Helper to fetch listing/stay title
 */
function getListingTitle($db, $type, $id) {
    try {
        if ($type === 'stay') {
            $stmt = $db->prepare("SELECT title FROM stays WHERE id = :id LIMIT 1");
        } else {
            $stmt = $db->prepare("SELECT title FROM hostings WHERE id = :id LIMIT 1");
        }
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && isset($row['title']) && !empty($row['title'])) {
            return $row['title'];
        }
    } catch (Exception $e) {
        error_log('[BOOKING STATUS] Failed to fetch listing title: ' . $e->getMessage());
    }
    return 'your listing';
}
?>


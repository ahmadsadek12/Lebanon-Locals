<?php
/**
 * Update Booking Payment Status API
 * Updates booking status after successful Whish payment
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

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['booking_id']) || empty($input['booking_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Booking ID is required']);
    exit();
}

$bookingId = intval($input['booking_id']);
$paymentStatus = isset($input['payment_status']) ? $input['payment_status'] : 'paid';
$transactionId = isset($input['payment_transaction_id']) ? $input['payment_transaction_id'] : null;

// Database connection
include_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    // Update booking payment status
    $query = "UPDATE bookings
              SET payment_status = :payment_status,
                  payment_transaction_id = :transaction_id,
                  updated_at = NOW()
              WHERE id = :booking_id";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':payment_status', $paymentStatus);
    $stmt->bindParam(':transaction_id', $transactionId);
    $stmt->bindParam(':booking_id', $bookingId);

    if ($stmt->execute()) {
        // Check if booking was actually updated
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Booking payment status updated successfully',
                'booking_id' => $bookingId
            ]);
        } else {
            // Booking might not exist or status was already set
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Booking not found or status already updated'
            ]);
        }
    } else {
        throw new Exception('Failed to update booking');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

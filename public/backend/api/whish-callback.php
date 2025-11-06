<?php
/**
 * Whish Payment Callback Handler
 * This endpoint is called by Whish after payment success or failure
 * Based on Whish API Documentation v1.3
 */

// Log all callbacks for debugging
$logFile = __DIR__ . '/../../logs/whish-callbacks.log';
$logDir = dirname($logFile);
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$callbackData = [
    'timestamp' => date('Y-m-d H:i:s'),
    'method' => $_SERVER['REQUEST_METHOD'],
    'get_params' => $_GET,
    'post_params' => $_POST,
    'raw_input' => file_get_contents('php://input'),
    'headers' => getallheaders()
];

file_put_contents($logFile, json_encode($callbackData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

// Include database connection
require_once __DIR__ . '/../config/database.php';

// Get status and booking_id from query parameters
$status = isset($_GET['status']) ? $_GET['status'] : null;
$bookingId = isset($_GET['booking_id']) ? $_GET['booking_id'] : null;

// Also check POST body if not in GET
if (!$status || !$bookingId) {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
        $status = isset($input['status']) ? $input['status'] : $status;
        $bookingId = isset($input['booking_id']) ? $input['booking_id'] : $bookingId;
    }
}

if (!$status || !$bookingId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit();
}

try {
    // Connect to database
    $database = new Database();
    $db = $database->getConnection();

    if ($db === null) {
        throw new Exception('Database connection failed');
    }

    // Update booking payment status based on callback
    if ($status === 'success') {
        // Payment successful
        $query = "UPDATE bookings
                  SET payment_status = 'paid',
                      payment_method = 'whish',
                      updated_at = NOW()
                  WHERE id = :booking_id";

        $stmt = $db->prepare($query);
        $stmt->bindValue(':booking_id', $bookingId, PDO::PARAM_INT);
        $stmt->execute();

        // Log success
        file_put_contents($logFile, "SUCCESS: Booking {$bookingId} payment completed\n\n", FILE_APPEND);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Payment confirmed',
            'booking_id' => $bookingId
        ]);

    } elseif ($status === 'failure') {
        // Payment failed
        $query = "UPDATE bookings
                  SET payment_status = 'failed',
                      updated_at = NOW()
                  WHERE id = :booking_id";

        $stmt = $db->prepare($query);
        $stmt->bindValue(':booking_id', $bookingId, PDO::PARAM_INT);
        $stmt->execute();

        // Log failure
        file_put_contents($logFile, "FAILURE: Booking {$bookingId} payment failed\n\n", FILE_APPEND);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Payment failure recorded',
            'booking_id' => $bookingId
        ]);

    } else {
        throw new Exception('Invalid status: ' . $status);
    }

} catch (Exception $e) {
    file_put_contents($logFile, "ERROR: " . $e->getMessage() . "\n\n", FILE_APPEND);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>

<?php
/**
 * Admin Payments API - Get All Payment Transactions
 * Shows payment-related data from bookings table
 */

require_once __DIR__ . '/../../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

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

    // Get all payments from bookings with user info
    $stmt = $db->query("
        SELECT
            b.id as booking_id,
            b.transaction_id,
            b.total_price,
            b.service_fee,
            b.payment_status,
            b.payment_method,
            b.receipt_url,
            b.booking_date,
            b.listing_type,
            b.listing_id,
            CONCAT(guest.first_name, ' ', guest.last_name) as guest_name,
            guest.email as guest_email,
            CONCAT(host.first_name, ' ', host.last_name) as host_name,
            host.email as host_email,
            CASE
                WHEN b.listing_type = 'stay' THEN stays.title
                WHEN b.listing_type IN ('experience', 'event') THEN hostings.title
            END as listing_title
        FROM bookings b
        LEFT JOIN users guest ON b.user_id = guest.id
        LEFT JOIN users host ON b.host_id = host.id
        LEFT JOIN stays ON b.listing_type = 'stay' AND b.listing_id = stays.id
        LEFT JOIN hostings ON b.listing_type IN ('experience', 'event') AND b.listing_id = hostings.id
        WHERE b.payment_status IS NOT NULL
          AND (b.booking_status != 'cancelled' OR b.booking_status IS NULL)
          AND (b.status != 'cancelled' OR b.status IS NULL)
        ORDER BY b.booking_date DESC
    ");
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $payments,
        'count' => count($payments)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

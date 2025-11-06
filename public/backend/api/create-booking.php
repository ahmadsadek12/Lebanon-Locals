<?php
/**
 * Create Booking API
 * Handles booking creation with various payment methods
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

if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'User authentication required']);
    exit();
}

// Validate required fields
$requiredFields = ['listing_type', 'listing_id', 'guests', 'email', 'phone', 'payment_method'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit();
    }
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Validate listing exists and get details
    $listingType = $input['listing_type'];
    $listingId = intval($input['listing_id']);

    if ($listingType === 'experience' || $listingType === 'event') {
        // Query hostings table
        $query = "SELECT * FROM hostings WHERE id = :id AND hosting_type = :type AND is_active = 1 LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $listingId);
        $stmt->bindParam(':type', $listingType);
        $stmt->execute();
        $listing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$listing) {
            throw new Exception('Listing not found or not available');
        }

        $price = floatval($listing['price']);
        $hostId = $listing['host_id'];

    } elseif ($listingType === 'stay') {
        // Query stays table
        $query = "SELECT * FROM stays WHERE id = :id AND is_active = 1 LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $listingId);
        $stmt->execute();
        $listing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$listing) {
            throw new Exception('Listing not found or not available');
        }

        $price = floatval($listing['price_per_night']);
        $hostId = $listing['host_id'];

    } else {
        throw new Exception('Invalid listing type');
    }

    // Calculate total price
    $guests = intval($input['guests']);
    $startDate = isset($input['start_date']) ? $input['start_date'] : date('Y-m-d');
    $endDate = isset($input['end_date']) ? $input['end_date'] : date('Y-m-d', strtotime('+1 day'));

    $basePrice = 0;
    if ($listingType === 'stay') {
        $start = new DateTime($startDate);
        $end = new DateTime($endDate);
        $nights = $start->diff($end)->days;
        $basePrice = $price * $nights;
    } else {
        $basePrice = $price * $guests;
    }

    $serviceFee = $basePrice * 0.10; // 10% service fee
    $totalPrice = $basePrice + $serviceFee;

    // Validate payment method
    $paymentMethod = $input['payment_method'];
    $allowedPaymentMethods = ['card', 'whish', 'cash'];

    if (!in_array($paymentMethod, $allowedPaymentMethods)) {
        throw new Exception('Invalid payment method');
    }

    // If cash is selected, verify it's enabled for this listing
    if ($paymentMethod === 'cash' && !$listing['cash_enabled']) {
        throw new Exception('Cash payment is not available for this listing');
    }

    // Get payment status and transaction ID from request
    // Payment is processed on frontend (Stripe/Whish)
    $paymentStatus = isset($input['payment_status']) ? $input['payment_status'] : 'pending';
    $paymentTransactionId = isset($input['payment_transaction_id']) ? $input['payment_transaction_id'] : null;

    // For cash, ensure status is pending
    if ($paymentMethod === 'cash') {
        $paymentStatus = 'pending';
        $paymentTransactionId = null;
    }

    // Create booking record
    $bookingQuery = "INSERT INTO bookings (
        user_id, host_id, listing_type, listing_id,
        start_date, end_date, guests,
        booking_type, booking_id, number_of_guests,
        check_in_date, check_out_date,
        total_price, payment_method, payment_status,
        guest_email, guest_phone, status,
        transaction_id
    ) VALUES (
        :user_id, :host_id, :listing_type, :listing_id,
        :start_date, :end_date, :guests,
        :booking_type, :booking_id, :number_of_guests,
        :check_in_date, :check_out_date,
        :total_price, :payment_method, :payment_status,
        :guest_email, :guest_phone, :status,
        :transaction_id
    )";

    // Determine booking_type and booking_id
    $bookingType = ($listingType === 'stay') ? 'stay' : 'hosting';
    $bookingIdValue = $listingId;
    
    // Status based on payment
    $bookingStatus = ($paymentStatus === 'paid') ? 'confirmed' : 'pending';

    $bookingStmt = $db->prepare($bookingQuery);
    $bookingStmt->bindParam(':user_id', $userId);
    $bookingStmt->bindParam(':host_id', $hostId);
    $bookingStmt->bindParam(':listing_type', $listingType);
    $bookingStmt->bindParam(':listing_id', $listingId);
    $bookingStmt->bindParam(':start_date', $startDate);
    $bookingStmt->bindParam(':end_date', $endDate);
    $bookingStmt->bindParam(':guests', $guests);
    $bookingStmt->bindParam(':booking_type', $bookingType);
    $bookingStmt->bindParam(':booking_id', $bookingIdValue);
    $bookingStmt->bindParam(':number_of_guests', $guests);
    $bookingStmt->bindParam(':check_in_date', $startDate);
    $bookingStmt->bindParam(':check_out_date', $endDate);
    $bookingStmt->bindParam(':total_price', $totalPrice);
    $bookingStmt->bindParam(':payment_method', $paymentMethod);
    $bookingStmt->bindParam(':payment_status', $paymentStatus);
    $bookingStmt->bindParam(':guest_email', $input['email']);
    $bookingStmt->bindParam(':guest_phone', $input['phone']);
    $bookingStmt->bindParam(':status', $bookingStatus);
    $bookingStmt->bindParam(':transaction_id', $paymentTransactionId);

    if (!$bookingStmt->execute()) {
        throw new Exception('Failed to create booking');
    }

    $bookingId = $db->lastInsertId();

    // TODO: Send confirmation email to guest and notification to host

    $response = [
        'success' => true,
        'message' => 'Booking created successfully',
        'booking_id' => $bookingId,
        'payment_status' => $paymentStatus,
        'total_price' => $totalPrice
    ];

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

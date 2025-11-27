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

// Optional debug info for notifications
$notificationsError = null;

try {
    $database = new Database();
    $db = $database->getConnection();

    // Validate listing exists and get details
    $listingType = $input['listing_type'];
    $listingId = intval($input['listing_id']);

    $listingTitle = 'Your listing';

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
        $listingTitle = $listing['title'] ?? 'Your listing';
        $maxGuests = intval($listing['max_guests']);

        // Check available capacity for events and experiences
        $capacityQuery = "SELECT COALESCE(SUM(number_of_guests), 0) AS current_guests
                          FROM bookings 
                          WHERE listing_type = :type 
                            AND listing_id = :id 
                            AND (booking_status IN ('confirmed', 'pending') OR status IN ('confirmed', 'pending'))
                            AND booking_status != 'rejected'
                            AND status != 'rejected'";
        
        $capacityStmt = $db->prepare($capacityQuery);
        $capacityStmt->bindParam(':type', $listingType);
        $capacityStmt->bindParam(':id', $listingId);
        $capacityStmt->execute();
        $capacityResult = $capacityStmt->fetch(PDO::FETCH_ASSOC);
        $currentGuests = intval($capacityResult['current_guests']);

        // Validate guests count
        $guests = intval($input['guests']);
        if (($currentGuests + $guests) > $maxGuests) {
            throw new Exception("Maximum guests limit reached for this listing. Available capacity: " . ($maxGuests - $currentGuests));
        }

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
        $listingTitle = $listing['title'] ?? 'Your listing';

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

    // Create notifications in main `notifications` table for host and admins
    // Using 'from' (booking user) and 'to' (host/admin) columns
    $notificationsError = null;
    try {
        // Validate required values before inserting
        if (empty($userId) || empty($hostId) || empty($bookingId)) {
            throw new Exception("Missing required values: userId={$userId}, hostId={$hostId}, bookingId={$bookingId}");
        }
        
        // Host notification: from = booking user, to = host
        $hostTitle = 'New booking';
        $hostMessage = "You have a new booking request for \"{$listingTitle}\" from {$input['email']}.";
        
        error_log("[BOOKING] Attempting to create notification - from: {$userId}, to: {$hostId}, booking_id: {$bookingId}");
        $hostNotif = $db->prepare("
            INSERT INTO notifications (`from`, `to`, title, message, related_id, is_read, created_at)
            VALUES (:from, :to, :title, :message, :related_id, 0, NOW())
        ");
        $result = $hostNotif->execute([
            ':from'       => $userId,
            ':to'         => $hostId,
            ':title'      => $hostTitle,
            ':message'    => $hostMessage,
            ':related_id' => $bookingId,
        ]);
        
        // With PDO::ERRMODE_EXCEPTION, execute() will throw on failure, so this check is redundant
        // But we keep it for safety
        if (!$result) {
            $errorInfo = $hostNotif->errorInfo();
            throw new Exception("Failed to insert host notification: " . print_r($errorInfo, true));
        }
        
        error_log("[BOOKING] Host notification created successfully - booking_id: {$bookingId}, host_id: {$hostId}, user_id: {$userId}");

        // One notification per admin as well: from = booking user, to = each admin
        $adminStmt = $db->query("SELECT id FROM users WHERE user_type = 'admin'");
        $adminIds = $adminStmt->fetchAll(PDO::FETCH_COLUMN);
        if ($adminIds) {
            $adminNotif = $db->prepare("
                INSERT INTO notifications (`from`, `to`, title, message, related_id, is_read, created_at)
                VALUES (:from, :to, :title, :message, :related_id, 0, NOW())
            ");
            $adminTitle = 'New booking';
            $adminMessage = "You have a new booking request for \"{$listingTitle}\" from {$input['email']}.";
            foreach ($adminIds as $adminId) {
                $result = $adminNotif->execute([
                    ':from'       => $userId,
                    ':to'         => $adminId,
                    ':title'      => $adminTitle,
                    ':message'    => $adminMessage,
                    ':related_id' => $bookingId,
                ]);
                
                if (!$result) {
                    $errorInfo = $adminNotif->errorInfo();
                    error_log("Failed to insert admin notification for admin ID {$adminId}: " . print_r($errorInfo, true));
                }
            }
        }
    } catch (PDOException $e) {
        $notificationsError = $e->getMessage();
        error_log('[BOOKING] PDO Exception creating notifications: ' . $e->getMessage());
        error_log('[BOOKING] SQL State: ' . $e->getCode());
        error_log('[BOOKING] SQL Error Info: ' . print_r($db->errorInfo(), true));
        // Don't fail the booking if notifications fail - just log the error
    } catch (Exception $e) {
        $notificationsError = $e->getMessage();
        error_log('[BOOKING] Exception creating notifications: ' . $e->getMessage());
        error_log('[BOOKING] Exception trace: ' . $e->getTraceAsString());
        // Don't fail the booking if notifications fail - just log the error
    }
    
    // Log successful notification creation for debugging
    if ($notificationsError === null) {
        error_log('[BOOKING] ✓ All notifications created successfully for booking_id: ' . $bookingId);
    } else {
        error_log('[BOOKING] ✗ Notification creation failed for booking_id: ' . $bookingId . ' - Error: ' . $notificationsError);
    }

    $response = [
        'success' => true,
        'message' => 'Booking created successfully',
        'booking_id' => $bookingId,
        'payment_status' => $paymentStatus,
        'total_price' => $totalPrice
    ];

    if ($notificationsError !== null) {
        $response['notifications_error'] = $notificationsError;
        $response['notifications_warning'] = 'Booking created but notifications failed. Check server logs.';
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}


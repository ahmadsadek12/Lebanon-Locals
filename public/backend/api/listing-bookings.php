<?php
/**
 * Listing Bookings API
 * Fetches all bookings for a specific listing (for host analytics)
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    include_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    $type = isset($_GET['type']) ? trim($_GET['type']) : null;
    $listingId = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User authentication required']);
        exit();
    }
    
    if (!$type || !in_array($type, ['experience', 'event', 'stay'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid listing type']);
        exit();
    }
    
    if (!$listingId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Listing ID required']);
        exit();
    }
    
    // Verify user is a host
    $userQuery = "SELECT user_type FROM users WHERE id = :user_id";
    $userStmt = $db->prepare($userQuery);
    $userStmt->bindParam(':user_id', $userId);
    $userStmt->execute();
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || ($user['user_type'] !== 'host' && $user['user_type'] !== 'admin')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only hosts can view booking analytics']);
        exit();
    }
    
    // Verify ownership
    if ($type === 'stay') {
        $ownerQuery = "SELECT host_id FROM stays WHERE id = :id";
    } else {
        $ownerQuery = "SELECT host_id FROM hostings WHERE id = :id AND hosting_type = :type";
    }
    
    $ownerStmt = $db->prepare($ownerQuery);
    $ownerStmt->bindParam(':id', $listingId);
    if ($type !== 'stay') {
        $ownerStmt->bindParam(':type', $type);
    }
    $ownerStmt->execute();
    $listing = $ownerStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$listing || $listing['host_id'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You do not own this listing']);
        exit();
    }
    
    // Fetch bookings for this listing
    $query = "SELECT 
                b.id,
                b.user_id,
                b.start_date,
                b.end_date,
                b.number_of_guests,
                b.number_of_nights,
                b.total_price,
                b.service_fee,
                b.status,
                b.booking_status,
                b.payment_status,
                b.created_at,
                u.first_name AS guest_first_name,
                u.last_name AS guest_last_name,
                u.profile_picture AS guest_profile_picture,
                u.email AS guest_email,
                u.phone_number AS guest_phone
              FROM bookings b
              LEFT JOIN users u ON b.user_id = u.id
              WHERE b.listing_type = :type
                AND b.listing_id = :listing_id
                AND b.host_id = :host_id
              ORDER BY b.created_at DESC";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':type', $type);
    $stmt->bindParam(':listing_id', $listingId);
    $stmt->bindParam(':host_id', $userId);
    $stmt->execute();
    
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'count' => count($bookings),
        'bookings' => $bookings
    ]);
    
} catch (Exception $e) {
    error_log("Listing Bookings Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>


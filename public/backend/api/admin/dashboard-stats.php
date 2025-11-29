<?php
/**
 * Admin Dashboard Statistics
 * Returns overview statistics for admin dashboard
 * Requires admin JWT token
 */

require_once __DIR__ . '/../../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

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

include_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/jwt-helper.php';

try {
    // Validate token and check if user is admin
    $jwtHelper = new JWTHelper();
    $payload = $jwtHelper->validateToken($token);
    $userId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Verify user is admin
    $stmt = $db->prepare("SELECT user_type FROM users WHERE id = :user_id");
    $stmt->execute(['user_id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || $user['user_type'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit();
    }

    // Get statistics
    $stats = [];

    // Total users
    $stmt = $db->query("SELECT COUNT(*) as count FROM users");
    $stats['total_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Total bookings
    $stmt = $db->query("SELECT COUNT(*) as count FROM bookings");
    $stats['total_bookings'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Total listings (experiences + events + stays)
    $stmt = $db->query("SELECT 
        (SELECT COUNT(*) FROM hostings WHERE is_active = 1) + 
        (SELECT COUNT(*) FROM stays WHERE is_active = 1) as count");
    $stats['total_listings'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Financial statistics (excluding cancelled bookings)
    $financialQuery = "SELECT 
        COALESCE(SUM(total_price), 0) as total_revenue,
        COALESCE(SUM(service_fee), 0) as total_service_fees,
        COALESCE(SUM(total_price - service_fee), 0) as host_earnings,
        COUNT(*) as paid_bookings_count
        FROM bookings 
        WHERE payment_status = 'paid' 
        AND (booking_status != 'cancelled' OR booking_status IS NULL)
        AND (status != 'cancelled' OR status IS NULL)";
    $financialStmt = $db->query($financialQuery);
    $financial = $financialStmt->fetch(PDO::FETCH_ASSOC);
    
    $stats['total_revenue'] = floatval($financial['total_revenue']);
    $stats['total_service_fees'] = floatval($financial['total_service_fees']);
    $stats['host_earnings'] = floatval($financial['host_earnings']);
    $stats['paid_bookings_count'] = intval($financial['paid_bookings_count']);

    // Additional stats
    $stmt = $db->query("SELECT COUNT(*) as count FROM reviews");
    $stats['total_reviews'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE user_type = 'pending'");
    $stats['pending_verifications'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    $stmt = $db->query("SELECT COUNT(*) as count FROM bookings WHERE booking_status = 'pending' OR status = 'pending'");
    $stats['pending_bookings'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Active hosts
    $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE user_type = 'host'");
    $stats['total_hosts'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Active listings breakdown
    $stmt = $db->query("SELECT COUNT(*) as count FROM hostings WHERE hosting_type = 'experience' AND is_active = 1");
    $stats['total_experiences'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM hostings WHERE hosting_type = 'event' AND is_active = 1");
    $stats['total_events'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM stays WHERE is_active = 1");
    $stats['total_stays'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Monthly revenue (current month)
    $monthlyQuery = "SELECT COALESCE(SUM(total_price), 0) as total 
                     FROM bookings 
                     WHERE payment_status = 'paid' 
                     AND MONTH(created_at) = MONTH(CURRENT_DATE())
                     AND YEAR(created_at) = YEAR(CURRENT_DATE())
                     AND (booking_status != 'cancelled' OR booking_status IS NULL)
                     AND (status != 'cancelled' OR status IS NULL)";
    $monthlyStmt = $db->query($monthlyQuery);
    $stats['monthly_revenue'] = floatval($monthlyStmt->fetch(PDO::FETCH_ASSOC)['total']);
    
    // Monthly service fees
    $monthlyFeesQuery = "SELECT COALESCE(SUM(service_fee), 0) as total 
                         FROM bookings 
                         WHERE payment_status = 'paid' 
                         AND MONTH(created_at) = MONTH(CURRENT_DATE())
                         AND YEAR(created_at) = YEAR(CURRENT_DATE())
                         AND (booking_status != 'cancelled' OR booking_status IS NULL)
                         AND (status != 'cancelled' OR status IS NULL)";
    $monthlyFeesStmt = $db->query($monthlyFeesQuery);
    $stats['monthly_service_fees'] = floatval($monthlyFeesStmt->fetch(PDO::FETCH_ASSOC)['total']);

    echo json_encode([
        'success' => true,
        'stats' => $stats
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>


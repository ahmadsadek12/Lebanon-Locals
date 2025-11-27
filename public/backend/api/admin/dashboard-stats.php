<?php
/**
 * Admin Dashboard Statistics
 * Returns overview statistics for admin dashboard
 * Requires admin JWT token
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

    // Total revenue
    $stmt = $db->query("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE payment_status = 'paid'");
    $stats['total_revenue'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Additional stats
    $stmt = $db->query("SELECT COUNT(*) as count FROM reviews");
    $stats['total_reviews'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE is_verified = 0");
    $stats['pending_verifications'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    $stmt = $db->query("SELECT COUNT(*) as count FROM bookings WHERE booking_status = 'pending'");
    $stats['pending_bookings'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

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


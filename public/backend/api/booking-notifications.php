<?php
/**
 * Booking Notifications API
 * Returns unread booking-related notifications for the current user.
 *
 * GET /backend/api/booking-notifications.php
 *   Headers: Authorization: Bearer <jwt from auth.js (auth_token)>
 *
 * Response:
 * {
 *   "success": true,
 *   "count": 1,
 *   "notifications": [
 *     {
 *       "id": 123,
 *       "booking_id": 45,
       *       "type": "booking_request" | "booking_update",
 *       "message": "You have a new booking request for \"Title\" from email@example.com",
 *       "status": "pending" | "confirmed" | "cancelled",
 *       "listing_type": "experience" | "event" | "stay",
 *       "listing_id": 99,
 *       "created_at": "2025-11-26 12:34:56"
 *     }
 *   ]
 * }
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt-helper.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get JWT token from Authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : null;

    if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit();
    }

    $token = $matches[1];

    $jwtHelper = new JWTHelper();
    $payload = $jwtHelper->validateToken($token);
    $userId = (int)$payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Only unread by default
    $query = "SELECT 
                bn.id,
                bn.booking_id,
                bn.type,
                bn.message,
                bn.is_read,
                bn.created_at,
                b.listing_type,
                b.listing_id,
                b.booking_status AS status
              FROM booking_notifications bn
              INNER JOIN bookings b ON bn.booking_id = b.id
              WHERE bn.user_id = :user_id
                AND bn.is_read = 0
              ORDER BY bn.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'count' => count($rows),
        'notifications' => $rows
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}



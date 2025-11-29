<?php
/**
 * Admin Get User Details API
 * Returns ALL user information from users table for admin review
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
    $adminId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Verify admin
    $stmt = $db->prepare("SELECT user_type FROM users WHERE id = :user_id");
    $stmt->execute(['user_id' => $adminId]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin || $admin['user_type'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit();
    }

    // Get user ID from query parameter
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        exit();
    }

    // Get ALL user data from users table (excluding password_hash for security)
    $query = "SELECT 
                id,
                email,
                user_type,
                first_name,
                last_name,
                gender,
                date_of_birth,
                age,
                nationality,
                id_passport_picture,
                profile_picture,
                phone_number,
                emergency_contact_name,
                emergency_contact_phone,
                credits,
                address_id,
                user_ranking,
                total_reviews,
                is_verified,
                is_active,
                bio,
                languages_spoken,
                created_at,
                years_hosting,
                updated_at,
                last_login
              FROM users
              WHERE id = :user_id
              LIMIT 1";

    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    echo json_encode([
        'success' => true,
        'data' => $user
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


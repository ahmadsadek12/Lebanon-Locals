<?php
/**
 * Get User Data API
 * Fetches current user's complete profile information
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Include database
require_once __DIR__ . '/../config/database.php';

// Start session
session_start();

try {
    $database = new Database();
    $db = $database->getConnection();

    if ($db === null) {
        throw new Exception('Database connection failed');
    }

    // Get user ID from query parameter
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id is required']);
        exit();
    }

    // Get user data
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
                profile_picture,
                phone_number,
                emergency_contact_name,
                emergency_contact_phone,
                address_id,
                credits,
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
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $user
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching user: ' . $e->getMessage()
    ]);
}
?>


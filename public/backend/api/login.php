<?php
/**
 * User Login API
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

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

// Validate required fields
if (!isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email and password are required']);
    exit();
}

$email = filter_var(trim($input['email']), FILTER_VALIDATE_EMAIL);
$password = trim($input['password']);

// Validate email format
if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit();
}

// Database connection
include_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt-helper.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    // Get user by email
    $query = "SELECT id, email, password_hash, first_name, last_name, phone_number, profile_picture, user_type, is_active
              FROM users
              WHERE email = :email";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':email', $email);
    $stmt->execute();

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Check if user exists AND is active (combined check for security)
    if (!$user || !$user['is_active']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit();
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit();
    }

    // Update last login time
    $updateQuery = "UPDATE users SET last_login = NOW() WHERE id = :user_id";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindParam(':user_id', $user['id']);
    $updateStmt->execute();

    // Generate JWT token
    $jwtHelper = new JWTHelper();
    $token = $jwtHelper->generateToken($user['id'], $user['email']);

    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'phone_number' => $user['phone_number'],
            'profile_picture' => $user['profile_picture'],
            'user_type' => $user['user_type']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Login error: ' . $e->getMessage()
    ]);
}

<?php
/**
 * User Registration API
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
$requiredFields = ['email', 'password', 'first_name', 'last_name'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || empty(trim($input[$field]))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => ucfirst(str_replace('_', ' ', $field)) . ' is required']);
        exit();
    }
}

$email = filter_var(trim($input['email']), FILTER_VALIDATE_EMAIL);
$password = trim($input['password']);
$firstName = trim($input['first_name']);
$lastName = trim($input['last_name']);
$phoneNumber = isset($input['phone_number']) ? trim($input['phone_number']) : null;
$dateOfBirth = isset($input['date_of_birth']) ? trim($input['date_of_birth']) : null;
$gender = isset($input['gender']) ? trim($input['gender']) : null;

// Calculate age from date of birth
$age = null;
if ($dateOfBirth) {
    $dob = new DateTime($dateOfBirth);
    $now = new DateTime();
    $age = $now->diff($dob)->y;
}

// Validate email format
if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit();
}

// Validate password strength (minimum 8 characters)
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
    exit();
}

// Database connection
include_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt-helper.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    // Check if email already exists
    $checkQuery = "SELECT id FROM users WHERE email = :email";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':email', $email);
    $checkStmt->execute();

    if ($checkStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        exit();
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Insert new user with date of birth, gender, and calculated age
    $insertQuery = "INSERT INTO users
                    (email, password_hash, first_name, last_name, phone_number, date_of_birth, age, gender, user_type, is_verified, is_active, created_at)
                    VALUES
                    (:email, :password_hash, :first_name, :last_name, :phone_number, :date_of_birth, :age, :gender, 'customer', 0, 1, NOW())";

    $insertStmt = $db->prepare($insertQuery);
    $insertStmt->bindParam(':email', $email);
    $insertStmt->bindParam(':password_hash', $passwordHash);
    $insertStmt->bindParam(':first_name', $firstName);
    $insertStmt->bindParam(':last_name', $lastName);
    $insertStmt->bindParam(':phone_number', $phoneNumber);
    $insertStmt->bindParam(':date_of_birth', $dateOfBirth);
    $insertStmt->bindValue(':age', $age, PDO::PARAM_INT);
    $insertStmt->bindParam(':gender', $gender);

    if ($insertStmt->execute()) {
        $userId = $db->lastInsertId();

        // Generate JWT token
        $jwtHelper = new JWTHelper();
        $token = $jwtHelper->generateToken($userId, $email);

        echo json_encode([
            'success' => true,
            'message' => 'Registration successful',
            'token' => $token,
            'user' => [
                'id' => $userId,
                'email' => $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'phone_number' => $phoneNumber,
                'date_of_birth' => $dateOfBirth,
                'age' => $age,
                'gender' => $gender,
                'user_type' => 'customer',
                'profile_picture' => null
            ]
        ]);
    } else {
        throw new Exception('Failed to create user account');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Registration error: ' . $e->getMessage()
    ]);
}

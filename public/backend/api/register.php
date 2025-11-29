<?php
/**
 * User Registration API
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

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
require_once __DIR__ . '/../config/rate-limiter.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Rate limiting: 3 registrations per hour per IP
    $rateLimiter = new RateLimiter($db, 3, 3600);
    $rateLimiter->checkLimit(null, 'register');

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
    
    // Handle nullable fields properly
    if (empty($phoneNumber)) {
        $insertStmt->bindValue(':phone_number', null, PDO::PARAM_NULL);
    } else {
        $insertStmt->bindParam(':phone_number', $phoneNumber);
    }
    
    if (empty($dateOfBirth)) {
        $insertStmt->bindValue(':date_of_birth', null, PDO::PARAM_NULL);
    } else {
        $insertStmt->bindParam(':date_of_birth', $dateOfBirth);
    }
    
    $insertStmt->bindValue(':age', $age, PDO::PARAM_INT);
    
    if (empty($gender)) {
        $insertStmt->bindValue(':gender', null, PDO::PARAM_NULL);
    } else {
        $insertStmt->bindParam(':gender', $gender);
    }

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
        $errorInfo = $insertStmt->errorInfo();
        $errorMessage = 'Failed to create user account';
        if (isset($errorInfo[2])) {
            $errorMessage .= ': ' . $errorInfo[2];
        }
        error_log("Registration failed: " . print_r($errorInfo, true));
        throw new Exception($errorMessage);
    }

} catch (PDOException $e) {
    http_response_code(500);
    $errorMessage = 'Registration error: ' . $e->getMessage();
    error_log("PDO Exception in register.php: " . $e->getMessage());
    
    // Provide user-friendly error messages
    if (strpos($e->getMessage(), 'Duplicate entry') !== false && strpos($e->getMessage(), 'email') !== false) {
        $errorMessage = 'An account with this email already exists. Please sign in instead.';
    } else if (strpos($e->getMessage(), 'SQLSTATE') !== false) {
        $errorMessage = 'Database error occurred. Please try again or contact support.';
    }
    
    echo json_encode([
        'success' => false,
        'message' => $errorMessage,
        'error' => $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    error_log("Exception in register.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Registration error: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}

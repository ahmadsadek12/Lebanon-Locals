<?php
/**
 * Become a Host API
 * Sets user_type to 'pending' for admin approval
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Include database
require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    if ($db === null) {
        throw new Exception('Database connection failed');
    }

    // Get input
    $input = json_decode(file_get_contents('php://input'), true);
    $user_id = isset($input['user_id']) ? intval($input['user_id']) : 0;

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id is required']);
        exit();
    }

    // Get current user data to validate
    $checkQuery = "SELECT user_type, gender, date_of_birth, phone_number, nationality, bio, 
                          languages_spoken, emergency_contact_name, emergency_contact_phone, address_id
                   FROM users 
                   WHERE id = :user_id";
    
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $checkStmt->execute();
    $user = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    // Check if already a host, admin, or pending
    if ($user['user_type'] === 'host' || $user['user_type'] === 'admin') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User is already a host']);
        exit();
    }
    
    if ($user['user_type'] === 'pending') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Your host application is pending admin approval']);
        exit();
    }

    // Validate required fields
    $requiredFields = [
        'gender' => 'Gender',
        'date_of_birth' => 'Date of Birth',
        'phone_number' => 'Phone Number',
        'nationality' => 'Nationality',
        'bio' => 'Bio',
        'languages_spoken' => 'Languages',
        'emergency_contact_name' => 'Emergency Contact Name',
        'emergency_contact_phone' => 'Emergency Contact Phone',
        'address_id' => 'Address'
    ];

    foreach ($requiredFields as $field => $label) {
        if (empty($user[$field])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "$label is required to become a host",
                'missing_field' => $field
            ]);
            exit();
        }
    }

    // Validate bio length
    if (strlen($user['bio']) < 100) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Bio must be at least 100 characters'
        ]);
        exit();
    }

    // Validate age (must be 18+)
    $birthDate = new DateTime($user['date_of_birth']);
    $today = new DateTime();
    $age = $today->diff($birthDate)->y;
    
    if ($age < 18) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'You must be at least 18 years old to become a host'
        ]);
        exit();
    }

    // All validations passed, set to pending for admin approval
    $updateQuery = "UPDATE users 
                    SET user_type = 'pending',
                        updated_at = NOW()
                    WHERE id = :user_id";
    
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $updateStmt->execute();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Your host application has been submitted and is pending admin approval'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>


<?php
/**
 * Upload Verification Document API
 * Handles ID/Passport uploads for user verification
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

    // Get user ID
    $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 
                (isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 0);

    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit();
    }

    // Check if file was uploaded
    if (!isset($_FILES['verification_document']) || $_FILES['verification_document']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error']);
        exit();
    }

    $file = $_FILES['verification_document'];

    // Validate file type (images and PDF)
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, GIF, PDF allowed']);
        exit();
    }

    // Validate file size (max 10MB)
    if ($file['size'] > 10 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'File too large. Maximum size is 10MB']);
        exit();
    }

    // Create upload directory if it doesn't exist
    $uploadDir = __DIR__ . '/../../images/users/' . $user_id . '/verification/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'id_' . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to move uploaded file');
    }

    // Database path (relative to public folder)
    $dbPath = 'images/users/' . $user_id . '/verification/' . $filename;

    // Update database - save to id_passport_picture field
    $updateQuery = "UPDATE users 
                    SET id_passport_picture = :id_passport_picture, 
                        updated_at = NOW() 
                    WHERE id = :user_id";
    $stmt = $db->prepare($updateQuery);
    $stmt->bindValue(':id_passport_picture', $dbPath, PDO::PARAM_STR);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Verification document uploaded successfully',
        'file_path' => $dbPath
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Upload error: ' . $e->getMessage()
    ]);
}
?>


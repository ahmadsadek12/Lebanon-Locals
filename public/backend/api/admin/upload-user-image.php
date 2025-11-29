<?php
/**
 * Admin Upload User Image API
 * Allows admin to upload profile picture or ID/passport picture for any user
 */

require_once __DIR__ . '/../../config/cors.php';
setCorsHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

    // Get user ID and image type
    $userId = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
    $imageType = isset($_POST['image_type']) ? $_POST['image_type'] : '';

    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        exit();
    }

    if (!in_array($imageType, ['profile_picture', 'id_passport_picture'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid image type']);
        exit();
    }

    // Get file based on image type
    $fileField = $imageType === 'profile_picture' ? 'profile_picture' : 'id_passport_picture';
    
    if (!isset($_FILES[$fileField]) || $_FILES[$fileField]['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error']);
        exit();
    }

    $file = $_FILES[$fileField];

    // Validate file type
    if ($imageType === 'profile_picture') {
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        $maxSize = 5 * 1024 * 1024; // 5MB
    } else {
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        $maxSize = 10 * 1024 * 1024; // 10MB
    }

    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid file type']);
        exit();
    }

    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'File too large']);
        exit();
    }

    // Create upload directory
    if ($imageType === 'profile_picture') {
        $uploadDir = __DIR__ . '/../../../images/users/' . $userId . '/';
    } else {
        $uploadDir = __DIR__ . '/../../../images/users/' . $userId . '/verification/';
    }

    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $prefix = $imageType === 'profile_picture' ? 'profile_' : 'id_';
    $filename = $prefix . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to move uploaded file');
    }

    // Database path (relative to public folder)
    if ($imageType === 'profile_picture') {
        $dbPath = 'images/users/' . $userId . '/' . $filename;
    } else {
        $dbPath = 'images/users/' . $userId . '/verification/' . $filename;
    }

    // Update database
    $updateQuery = "UPDATE users SET {$imageType} = :image_path, updated_at = NOW() WHERE id = :user_id";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindValue(':image_path', $dbPath, PDO::PARAM_STR);
    $updateStmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $updateStmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Image uploaded successfully',
        'file_path' => $dbPath
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


<?php
/**
 * Admin Upload Listing Image API
 * Allows admin to upload main image for any listing (experience, event, or stay)
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
require_once __DIR__ . '/../../utils/S3Uploader.php';

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

    // Get listing ID and type
    $listingId = isset($_POST['listing_id']) ? intval($_POST['listing_id']) : 0;
    $listingType = isset($_POST['listing_type']) ? $_POST['listing_type'] : '';

    if (!$listingId || !in_array($listingType, ['experience', 'event', 'stay'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid listing ID and type are required']);
        exit();
    }

    // Get file
    $fileField = 'main_image';
    
    if (!isset($_FILES[$fileField]) || $_FILES[$fileField]['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error']);
        exit();
    }

    $file = $_FILES[$fileField];

    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($fileExtension, ['jpg', 'jpeg', 'png', 'webp'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, WEBP allowed']);
        exit();
    }

    // Validate file size (max 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'File too large. Maximum size is 5MB']);
        exit();
    }

    // Get host_id for S3 path
    if ($listingType === 'stay') {
        $hostQuery = "SELECT host_id FROM stays WHERE id = :id";
    } else {
        $hostQuery = "SELECT host_id FROM hostings WHERE id = :id";
    }
    
    $hostStmt = $db->prepare($hostQuery);
    $hostStmt->execute(['id' => $listingId]);
    $listing = $hostStmt->fetch(PDO::FETCH_ASSOC);

    if (!$listing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Listing not found']);
        exit();
    }

    $hostId = $listing['host_id'];

    // Upload to S3
    $bucketFolder = $listingType === 'stay' ? 'stays' : 'hostings';
    $key = S3Uploader::buildKey(
        sprintf('%s/user-%s', $bucketFolder, $hostId),
        'main',
        $fileExtension
    );
    $contentType = $file['type'] ?? mime_content_type($file['tmp_name']) ?: 'application/octet-stream';
    $imagePath = S3Uploader::uploadFile($file['tmp_name'], $key, $contentType);

    // Update database
    if ($listingType === 'stay') {
        $updateQuery = "UPDATE stays SET main_image = :main_image, updated_at = NOW() WHERE id = :id";
    } else {
        $updateQuery = "UPDATE hostings SET main_image = :main_image, updated_at = NOW() WHERE id = :id";
    }
    
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindValue(':main_image', $imagePath, PDO::PARAM_STR);
    $updateStmt->bindValue(':id', $listingId, PDO::PARAM_INT);
    $updateStmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Image uploaded successfully',
        'file_path' => $imagePath
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


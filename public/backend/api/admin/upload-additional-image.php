<?php
/**
 * Admin Upload Additional Listing Image API
 * Allows admin to upload additional images for any listing (experience, event, or stay)
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

    // Get listing ID, type, and metadata
    $listingId = isset($_POST['listing_id']) ? intval($_POST['listing_id']) : 0;
    $listingType = isset($_POST['listing_type']) ? $_POST['listing_type'] : '';
    $category = isset($_POST['category']) ? trim($_POST['category']) : 'General';
    $room = isset($_POST['room']) ? trim($_POST['room']) : 'General';

    if (!$listingId || !in_array($listingType, ['experience', 'event', 'stay'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid listing ID and type are required']);
        exit();
    }

    // Get file
    $fileField = 'additional_image';
    
    if (!isset($_FILES[$fileField]) || $_FILES[$fileField]['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error']);
        exit();
    }

    $file = $_FILES[$fileField];

    // Validate file type
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

    // Get host_id and current max display_order
    if ($listingType === 'stay') {
        $hostQuery = "SELECT host_id FROM stays WHERE id = :id";
        $imageTable = 'stay_images';
        $imageIdColumn = 'stay_id';
    } else {
        $hostQuery = "SELECT host_id FROM hostings WHERE id = :id";
        $imageTable = 'hosting_images';
        $imageIdColumn = 'hosting_id';
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

    // Get max display_order
    $maxOrderQuery = "SELECT MAX(display_order) as max_order FROM {$imageTable} WHERE {$imageIdColumn} = :id";
    $maxOrderStmt = $db->prepare($maxOrderQuery);
    $maxOrderStmt->execute(['id' => $listingId]);
    $maxOrderResult = $maxOrderStmt->fetch(PDO::FETCH_ASSOC);
    $displayOrder = ($maxOrderResult['max_order'] ?? 0) + 1;

    // Upload to S3
    $bucketFolder = $listingType === 'stay' ? 'stays' : 'hostings';
    $key = S3Uploader::buildKey(
        sprintf('%s/user-%s', $bucketFolder, $hostId),
        'extra-' . time() . '-' . rand(1000, 9999),
        $fileExtension
    );
    $contentType = $file['type'] ?? mime_content_type($file['tmp_name']) ?: 'application/octet-stream';
    $imagePath = S3Uploader::uploadFile($file['tmp_name'], $key, $contentType);

    // Insert into database
    if ($listingType === 'stay') {
        $insertQuery = "INSERT INTO stay_images (stay_id, room, image, is_primary, display_order, created_at)
                        VALUES (:id, :room, :image, 0, :display_order, NOW())";
        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->bindValue(':id', $listingId, PDO::PARAM_INT);
        $insertStmt->bindValue(':room', $room, PDO::PARAM_STR);
        $insertStmt->bindValue(':image', $imagePath, PDO::PARAM_STR);
        $insertStmt->bindValue(':display_order', $displayOrder, PDO::PARAM_INT);
        $insertStmt->execute();
        $imageId = $db->lastInsertId();
    } else {
        $insertQuery = "INSERT INTO hosting_images (hosting_id, category, image, is_primary, display_order, created_at)
                        VALUES (:id, :category, :image, 0, :display_order, NOW())";
        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->bindValue(':id', $listingId, PDO::PARAM_INT);
        $insertStmt->bindValue(':category', $category, PDO::PARAM_STR);
        $insertStmt->bindValue(':image', $imagePath, PDO::PARAM_STR);
        $insertStmt->bindValue(':display_order', $displayOrder, PDO::PARAM_INT);
        $insertStmt->execute();
        $imageId = $db->lastInsertId();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Image uploaded successfully',
        'image_id' => $imageId,
        'file_path' => $imagePath,
        'display_order' => $displayOrder
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


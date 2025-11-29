<?php
/**
 * Admin Delete Additional Listing Image API
 * Allows admin to delete additional images for any listing
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
$input = json_decode(file_get_contents('php://input'), true);

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

    $imageId = isset($input['image_id']) ? intval($input['image_id']) : 0;
    $listingType = isset($input['listing_type']) ? $input['listing_type'] : '';

    if (!$imageId || !in_array($listingType, ['experience', 'event', 'stay'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid image ID and listing type are required']);
        exit();
    }

    // Determine table name
    $imageTable = ($listingType === 'stay') ? 'stay_images' : 'hosting_images';

    // Get image path before deletion (for potential S3 cleanup later)
    $getQuery = "SELECT image FROM {$imageTable} WHERE id = :id AND is_primary = 0";
    $getStmt = $db->prepare($getQuery);
    $getStmt->execute(['id' => $imageId]);
    $image = $getStmt->fetch(PDO::FETCH_ASSOC);

    if (!$image) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Image not found or is primary image']);
        exit();
    }

    // Delete from database
    $deleteQuery = "DELETE FROM {$imageTable} WHERE id = :id AND is_primary = 0";
    $deleteStmt = $db->prepare($deleteQuery);
    $deleteStmt->execute(['id' => $imageId]);

    if ($deleteStmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Image deleted successfully'
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Image not found']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


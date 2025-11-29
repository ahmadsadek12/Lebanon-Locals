<?php
/**
 * Admin Update Amenity API
 */

require_once __DIR__ . '/../../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : null;

if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit();
}

$token = $matches[1];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$isMultipart = stripos($contentType, 'multipart/form-data') !== false;
$input = $isMultipart ? $_POST : json_decode(file_get_contents('php://input'), true);
$input = is_array($input) ? $input : [];

include_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/jwt-helper.php';
require_once __DIR__ . '/../../utils/S3Uploader.php';

try {
    $jwtHelper = new JWTHelper();
    $payload = $jwtHelper->validateToken($token);
    $userId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Verify admin
    $stmt = $db->prepare("SELECT user_type FROM users WHERE id = :user_id");
    $stmt->execute(['user_id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || $user['user_type'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit();
    }

    // Validate input
    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Amenity ID is required']);
        exit();
    }

    // Update amenity
    $updateStmt = $db->prepare("
        UPDATE amenities
        SET name = :name,
            category = :category,
            icon_url = :icon_url
        WHERE id = :id
    ");

    $iconUrl = isset($input['icon_url']) ? trim($input['icon_url']) : '';

    if (isset($_FILES['icon_file']) && $_FILES['icon_file']['error'] === UPLOAD_ERR_OK) {
        $iconExtension = strtolower(pathinfo($_FILES['icon_file']['name'], PATHINFO_EXTENSION));
        $allowedIconExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

        if (!in_array($iconExtension, $allowedIconExtensions)) {
            throw new Exception('Invalid icon file type. Allowed: JPG, JPEG, PNG, WEBP, SVG');
        }

        $iconKey = S3Uploader::buildKey(
            sprintf('amenities/%s', $input['id']),
            'icon',
            $iconExtension
        );
        $contentType = $_FILES['icon_file']['type'] ?? mime_content_type($_FILES['icon_file']['tmp_name']) ?: 'application/octet-stream';
        $iconUrl = S3Uploader::uploadFile($_FILES['icon_file']['tmp_name'], $iconKey, $contentType);
    }

    $updateStmt->execute([
        'id' => $input['id'],
        'name' => trim($input['name']),
        'category' => isset($input['category']) ? trim($input['category']) : '',
        'icon_url' => $iconUrl
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Amenity updated successfully',
        'icon_url' => $iconUrl
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

<?php
/**
 * Admin Create Amenity API
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
    if (!isset($input['name']) || empty(trim($input['name']))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Amenity name is required']);
        exit();
    }

    $pendingIconUrl = isset($input['icon_url']) ? trim($input['icon_url']) : '';
    $insertStmt = $db->prepare("
        INSERT INTO amenities (name, category, icon_url)
        VALUES (:name, :category, :icon_url)
    ");

    $insertStmt->execute([
        'name' => trim($input['name']),
        'category' => isset($input['category']) ? trim($input['category']) : '',
        'icon_url' => $pendingIconUrl
    ]);

    $amenityId = $db->lastInsertId();
    $finalIconUrl = $pendingIconUrl;

    if (isset($_FILES['icon_file']) && $_FILES['icon_file']['error'] === UPLOAD_ERR_OK) {
        $iconExtension = strtolower(pathinfo($_FILES['icon_file']['name'], PATHINFO_EXTENSION));
        $allowedIconExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

        if (!in_array($iconExtension, $allowedIconExtensions)) {
            throw new Exception('Invalid icon file type. Allowed: JPG, JPEG, PNG, WEBP, SVG');
        }

        $iconKey = S3Uploader::buildKey(
            sprintf('amenities/%s', $amenityId),
            'icon',
            $iconExtension
        );
        $contentType = $_FILES['icon_file']['type'] ?? mime_content_type($_FILES['icon_file']['tmp_name']) ?: 'application/octet-stream';
        $finalIconUrl = S3Uploader::uploadFile($_FILES['icon_file']['tmp_name'], $iconKey, $contentType);

        $updateIconStmt = $db->prepare("UPDATE amenities SET icon_url = :icon_url WHERE id = :id");
        $updateIconStmt->execute([
            'icon_url' => $finalIconUrl,
            'id' => $amenityId
        ]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Amenity created successfully',
        'id' => $amenityId,
        'icon_url' => $finalIconUrl
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

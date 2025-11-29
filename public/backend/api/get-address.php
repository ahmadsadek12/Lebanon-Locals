<?php
/**
 * Get Address API
 * Fetches address details by address_id
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $address_id = isset($_GET['address_id']) ? intval($_GET['address_id']) : 0;

    if (!$address_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'address_id is required']);
        exit();
    }

    $query = "SELECT * FROM addresses WHERE id = :address_id LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindValue(':address_id', $address_id, PDO::PARAM_INT);
    $stmt->execute();

    $address = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$address) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Address not found']);
        exit();
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $address
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>


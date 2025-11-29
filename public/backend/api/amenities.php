<?php
/**
 * Lebanon Locals - Amenities API Endpoint
 * GET /api/amenities.php
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

include_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

if ($db === null) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

try {
    $query = "SELECT id, name, category FROM amenities ORDER BY name ASC";
    $stmt = $db->prepare($query);
    $stmt->execute();

    $amenities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'count' => count($amenities),
        'data' => $amenities
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Query failed: ' . $e->getMessage()
    ]);
}




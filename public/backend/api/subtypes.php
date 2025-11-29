<?php
/**
 * Lebanon Locals - Subtypes API Endpoint
 * GET /api/subtypes.php?category=experience|event|stay
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

$allowedCategories = ['experience', 'event', 'stay'];
$category = isset($_GET['category']) ? strtolower(trim($_GET['category'])) : null;

if (!$category || !in_array($category, $allowedCategories, true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid or missing category parameter. Accepted values: experience, event, stay.'
    ]);
    exit();
}

try {
    $query = "SELECT id, name, description, icon_url
              FROM subtypes
              WHERE category = :category
              ORDER BY name ASC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':category', $category, PDO::PARAM_STR);
    $stmt->execute();

    $subtypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'count' => count($subtypes),
        'data' => $subtypes
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Query failed: ' . $e->getMessage()
    ]);
}



<?php
/**
 * Property Types API
 * Returns available stay property types based on database values.
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

include_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit();
}

try {
    $types = [];
    $primaryQuerySucceeded = false;

    try {
        $primaryQuery = "SELECT id, name FROM property_types ORDER BY name ASC";
        $primaryStmt = $db->prepare($primaryQuery);
        $primaryStmt->execute();
        $types = $primaryStmt->fetchAll(PDO::FETCH_ASSOC);
        $primaryQuerySucceeded = true;
    } catch (Exception $inner) {
        // Table may not exist; fallback below.
        $primaryQuerySucceeded = false;
    }

    if (!$primaryQuerySucceeded || empty($types)) {
        $fallbackQuery = "SELECT DISTINCT property_type AS name
                          FROM stays
                          WHERE property_type IS NOT NULL AND property_type <> ''
                          ORDER BY property_type ASC";
        $fallbackStmt = $db->prepare($fallbackQuery);
        $fallbackStmt->execute();
        $types = $fallbackStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode([
        'success' => true,
        'count' => count($types),
        'data' => $types
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load property types: ' . $e->getMessage()
    ]);
}


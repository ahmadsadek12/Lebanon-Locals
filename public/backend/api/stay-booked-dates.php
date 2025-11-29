<?php
/**
 * Lebanon Locals - Stay Booked Dates API
 * Returns booked date ranges for a stay
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
    $stayId = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($stayId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Valid stay ID is required'
        ]);
        exit();
    }

    // Fetch booked date ranges from stay_dates table
    $query = "SELECT start_date, end_date
              FROM stay_dates
              WHERE stay_id = :stay_id
              ORDER BY start_date ASC";

    $stmt = $db->prepare($query);
    $stmt->bindValue(':stay_id', $stayId, PDO::PARAM_INT);
    $stmt->execute();

    $bookedDates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'count' => count($bookedDates),
        'data' => $bookedDates
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Query failed: ' . $e->getMessage()
    ]);
}
?>


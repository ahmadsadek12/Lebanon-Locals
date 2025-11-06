<?php
/**
 * Update Address API
 * Creates or updates user's address
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

require_once __DIR__ . '/../config/database.php';
session_start();

try {
    $database = new Database();
    $db = $database->getConnection();

    $input = json_decode(file_get_contents('php://input'), true);

    $user_id = isset($input['user_id']) ? intval($input['user_id']) : 
                (isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 0);

    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit();
    }

    $address_id = isset($input['address_id']) ? intval($input['address_id']) : null;

    // If address exists, update it
    if ($address_id) {
        $query = "UPDATE addresses 
                  SET country = :country,
                      city = :city,
                      street = :street,
                      building = :building,
                      floor = :floor,
                      updated_at = NOW()
                  WHERE id = :address_id";

        $stmt = $db->prepare($query);
        $stmt->bindValue(':country', trim($input['country'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':city', trim($input['city'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':street', trim($input['street'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':building', trim($input['building'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':floor', trim($input['floor'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':address_id', $address_id, PDO::PARAM_INT);
        $stmt->execute();

        $responseAddressId = $address_id;
    } else {
        // Create new address
        $query = "INSERT INTO addresses 
                  (country, city, street, building, floor, created_at) 
                  VALUES 
                  (:country, :city, :street, :building, :floor, NOW())";

        $stmt = $db->prepare($query);
        $stmt->bindValue(':country', trim($input['country'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':city', trim($input['city'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':street', trim($input['street'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':building', trim($input['building'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':floor', trim($input['floor'] ?? ''), PDO::PARAM_STR);
        $stmt->execute();

        $responseAddressId = $db->lastInsertId();

        // Link address to user
        $updateUserQuery = "UPDATE users SET address_id = :address_id WHERE id = :user_id";
        $updateStmt = $db->prepare($updateUserQuery);
        $updateStmt->bindValue(':address_id', $responseAddressId, PDO::PARAM_INT);
        $updateStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $updateStmt->execute();
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Address updated successfully',
        'address_id' => $responseAddressId
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>


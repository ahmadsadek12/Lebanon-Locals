<?php
/**
 * Lebanon Locals - Wishlist API Endpoint
 * Handles wishlist operations: get, add, remove
 *
 * GET /api/wishlist.php - Get all wishlist items for user
 * POST /api/wishlist.php - Add item to wishlist
 * DELETE /api/wishlist.php - Remove item from wishlist
 *
 * @version 1.0.0
 */

// Enable error reporting for debugging
ini_set('display_errors', 0);
error_reporting(E_ALL);

// CORS headers
require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

// Include database connection
$dbFile = __DIR__ . '/../config/database.php';

if (!file_exists($dbFile)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database config file not found'
    ]);
    exit();
}

include_once $dbFile;

// Start session for user authentication
session_start();

// Instantiate database
$database = new Database();
$db = $database->getConnection();

// Check connection
if ($db === null) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

try {
    $method = $_SERVER['REQUEST_METHOD'];

    // For now, use session user_id or get from request
    // TODO: Implement proper authentication
    $user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

    // Temporary: Get user_id from query/body for testing
    if (!$user_id) {
        if ($method === 'GET') {
            $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 1;
        } else {
            $input = json_decode(file_get_contents('php://input'), true);
            $user_id = isset($input['user_id']) ? intval($input['user_id']) : 1;
        }
    }

    if (!$user_id || $user_id <= 0) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'User not authenticated'
        ]);
        exit();
    }

    // GET - Retrieve all wishlist items with full details
    if ($method === 'GET') {
        $query = "SELECT
                    w.id AS wishlist_id,
                    w.item_id,
                    w.item_type,
                    w.created_at
                  FROM wishlist w
                  WHERE w.user_id = :user_id
                  ORDER BY w.created_at DESC";

        $stmt = $db->prepare($query);
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();

        $wishlistItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch full details for each item
        $detailedItems = [];
        foreach ($wishlistItems as $item) {
            $detailQuery = '';
            $itemType = $item['item_type'];
            $itemId = $item['item_id'];

            if ($itemType === 'experience' || $itemType === 'event') {
                $hostingType = $itemType === 'experience' ? 'experience' : 'event';
                $detailQuery = "SELECT
                                    h.id,
                                    h.title,
                                    h.main_image,
                                    h.price,
                                    h.price_per_person,
                                    h.location,
                                    h.hosting_type,
                                    COALESCE(r.avg_rating, 0) AS average_rating,
                                    COALESCE(r.review_count, 0) AS total_reviews
                                FROM hostings h
                                LEFT JOIN (
                                    SELECT reviewee_id,
                                           AVG(stars) AS avg_rating,
                                           COUNT(*) AS review_count
                                    FROM reviews
                                    WHERE reviewee_type = 'hosting'
                                    GROUP BY reviewee_id
                                ) r ON r.reviewee_id = h.id
                                WHERE h.id = :item_id
                                  AND h.hosting_type = :hosting_type
                                  AND h.is_active = 1
                                LIMIT 1";

                $detailStmt = $db->prepare($detailQuery);
                $detailStmt->bindValue(':item_id', $itemId, PDO::PARAM_INT);
                $detailStmt->bindValue(':hosting_type', $hostingType, PDO::PARAM_STR);
                $detailStmt->execute();
            } else if ($itemType === 'stay') {
                $detailQuery = "SELECT
                                    s.id,
                                    s.title,
                                    s.main_image,
                                    s.price_per_night,
                                    s.location,
                                    s.number_of_bedrooms,
                                    COALESCE(r.avg_rating, 0) AS average_rating,
                                    COALESCE(r.review_count, 0) AS total_reviews
                                FROM stays s
                                LEFT JOIN (
                                    SELECT reviewee_id,
                                           AVG(stars) AS avg_rating,
                                           COUNT(*) AS review_count
                                    FROM reviews
                                    WHERE reviewee_type = 'stay'
                                    GROUP BY reviewee_id
                                ) r ON r.reviewee_id = s.id
                                WHERE s.id = :item_id
                                  AND s.is_active = 1
                                LIMIT 1";

                $detailStmt = $db->prepare($detailQuery);
                $detailStmt->bindValue(':item_id', $itemId, PDO::PARAM_INT);
                $detailStmt->execute();
            }

            $details = $detailStmt->fetch(PDO::FETCH_ASSOC);

            if ($details) {
                $details['_type'] = $itemType;
                $details['wishlist_id'] = $item['wishlist_id'];
                $details['added_at'] = $item['created_at'];
                $detailedItems[] = $details;
            }
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'count' => count($detailedItems),
            'data' => $detailedItems
        ]);
    }

    // POST - Add item to wishlist
    else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['item_id']) || !isset($input['item_type'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'item_id and item_type are required'
            ]);
            exit();
        }

        $item_id = intval($input['item_id']);
        $item_type = $input['item_type'];

        // Validate item_type
        $valid_types = ['experience', 'event', 'stay'];
        if (!in_array($item_type, $valid_types)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Invalid item_type. Must be experience, event, or stay'
            ]);
            exit();
        }

        // Check if item already exists in wishlist
        $checkQuery = "SELECT id FROM wishlist
                       WHERE user_id = :user_id
                         AND item_id = :item_id
                         AND item_type = :item_type";

        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $checkStmt->bindValue(':item_id', $item_id, PDO::PARAM_INT);
        $checkStmt->bindValue(':item_type', $item_type, PDO::PARAM_STR);
        $checkStmt->execute();

        if ($checkStmt->fetch()) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Item already in wishlist'
            ]);
            exit();
        }

        // Insert into wishlist
        $insertQuery = "INSERT INTO wishlist (user_id, item_id, item_type)
                        VALUES (:user_id, :item_id, :item_type)";

        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $insertStmt->bindValue(':item_id', $item_id, PDO::PARAM_INT);
        $insertStmt->bindValue(':item_type', $item_type, PDO::PARAM_STR);
        $insertStmt->execute();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Item added to wishlist',
            'wishlist_id' => $db->lastInsertId()
        ]);
    }

    // DELETE - Remove item from wishlist
    else if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['item_id']) || !isset($input['item_type'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'item_id and item_type are required'
            ]);
            exit();
        }

        $item_id = intval($input['item_id']);
        $item_type = $input['item_type'];

        $deleteQuery = "DELETE FROM wishlist
                        WHERE user_id = :user_id
                          AND item_id = :item_id
                          AND item_type = :item_type";

        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $deleteStmt->bindValue(':item_id', $item_id, PDO::PARAM_INT);
        $deleteStmt->bindValue(':item_type', $item_type, PDO::PARAM_STR);
        $deleteStmt->execute();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Item removed from wishlist',
            'affected_rows' => $deleteStmt->rowCount()
        ]);
    }

    else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
    }

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>

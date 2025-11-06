<?php
/**
 * Lebanon Locals - Stay Detail API Endpoint
 * GET /api/stay-detail.php?id=123
 *
 * @version 1.0.0
 */

// Enable error reporting
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Include database connection
$dbFile = __DIR__ . '/../config/database.php';

if (!file_exists($dbFile)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database config file not found',
        'path' => $dbFile
    ]);
    exit();
}

include_once $dbFile;

// Instantiate database
$database = new Database();
$db = $database->getConnection();

// Check connection
if ($db === null) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

try {
    // Get stay ID from query parameter
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Valid stay ID is required'
        ]);
        exit();
    }

    // Fetch stay details
    $query = "SELECT
                s.id,
                s.title,
                s.description,
                s.price_per_night,
                s.cleaning_fee,
                s.service_fee_percentage,
                s.main_image,
                s.location,
                s.max_guests,
                s.number_of_bedrooms,
                s.number_of_beds,
                s.number_double_beds,
                s.number_single_beds,
                s.number_bunk_beds,
                s.number_of_bathrooms,
                s.property_type,
                s.min_nights,
                s.max_nights,
                s.cancellation_policy,
                s.house_rules,
                s.cash_enabled,
                s.check_in_time,
                s.check_out_time,
                s.address_id,
                a.latitude AS address_latitude,
                a.longitude AS address_longitude,
                a.street AS address_street,
                a.city AS address_city,
                a.country AS address_country,
                (s.max_guests - COALESCE(s.total_bookings, 0)) AS available_capacity,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS total_reviews,
                u.id AS host_id,
                u.first_name AS host_first_name,
                u.last_name AS host_last_name,
                u.profile_picture AS host_picture,
                u.bio AS host_bio,
                u.is_verified AS host_verified
              FROM stays s
              LEFT JOIN users u ON s.host_id = u.id
              LEFT JOIN addresses a ON s.address_id = a.id
              LEFT JOIN (
                    SELECT reviewee_id,
                           AVG(stars) AS avg_rating,
                           COUNT(*) AS review_count
                    FROM reviews
                    WHERE reviewee_type = 'stay'
                    GROUP BY reviewee_id
              ) r ON r.reviewee_id = s.id
              WHERE s.id = :id
                AND s.is_active = 1
              LIMIT 1";

    $stmt = $db->prepare($query);
    $stmt->bindValue(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    $stay = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$stay) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Stay not found'
        ]);
        exit();
    }

    // Fetch subtypes
    $subtypeQuery = "SELECT s.name, s.description, s.icon_url
                      FROM stay_subtypes ss
                      JOIN subtypes s ON ss.subtype_id = s.id
                      WHERE ss.stay_id = :id";

    $subtypeStmt = $db->prepare($subtypeQuery);
    $subtypeStmt->bindValue(':id', $id, PDO::PARAM_INT);
    $subtypeStmt->execute();

    $stay['subtypes'] = $subtypeStmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch amenities (column may not exist)
    try {
        $amenitiesQuery = "SELECT a.id, a.name, a.category
                            FROM stay_amenities sa
                            JOIN amenities a ON sa.amenity_id = a.id
                            WHERE sa.stay_id = :id
                            ORDER BY a.category ASC, a.name ASC";

        $amenitiesStmt = $db->prepare($amenitiesQuery);
        $amenitiesStmt->bindValue(':id', $id, PDO::PARAM_INT);
        $amenitiesStmt->execute();

        $stay['amenities'] = $amenitiesStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Table/column doesn't exist, set empty array
        $stay['amenities'] = [];
    }

    // Fetch additional images from stay_images table
    try {
        $imagesQuery = "SELECT 
                            id, 
                            image AS image_url, 
                            room AS caption, 
                            display_order,
                            is_primary
                         FROM stay_images
                         WHERE stay_id = :id
                         ORDER BY is_primary DESC, display_order ASC, id ASC";

        $imagesStmt = $db->prepare($imagesQuery);
        $imagesStmt->bindValue(':id', $id, PDO::PARAM_INT);
        $imagesStmt->execute();

        $stay['images'] = $imagesStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Table doesn't exist, set empty array
        $stay['images'] = [];
    }

    // Fetch reviews
    $reviewsQuery = "SELECT
                        r.id,
                        r.stars,
                        r.review_text,
                        r.created_at,
                        u.first_name AS reviewer_first_name,
                        u.last_name AS reviewer_last_name,
                        u.profile_picture AS reviewer_picture
                      FROM reviews r
                      LEFT JOIN users u ON r.reviewer_id = u.id
                      WHERE r.reviewee_id = :id
                        AND r.reviewee_type = 'stay'
                      ORDER BY r.created_at DESC
                      LIMIT 10";

    $reviewsStmt = $db->prepare($reviewsQuery);
    $reviewsStmt->bindValue(':id', $id, PDO::PARAM_INT);
    $reviewsStmt->execute();

    $stay['reviews'] = $reviewsStmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [
        'success' => true,
        'data' => $stay
    ];

    http_response_code(200);
    echo json_encode($response, JSON_PRETTY_PRINT);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Query failed: ' . $e->getMessage()
    ]);
}

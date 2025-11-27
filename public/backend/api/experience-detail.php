<?php
/**
 * Lebanon Locals - Experience Detail API Endpoint
 * GET /api/experience-detail.php?id=123
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
    // Get experience ID from query parameter
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Valid experience ID is required'
        ]);
        exit();
    }

    // Fetch experience details
    $query = "SELECT
                h.id,
                h.title,
                h.description,
                h.price,
                h.price_per_person,
                h.length_hours,
                h.length_days,
                h.main_image,
                h.location,
                h.max_guests,
                h.min_guests,
                h.difficulty,
                h.max_guests_per_price,
                h.service_fee_percentage,
                h.min_age,
                h.max_age,
                h.hour_start,
                h.hour_end,
                h.date_start,
                h.date_end,
                h.cancellation_policy,
                h.cash_enabled,
                (h.max_guests - COALESCE((
                    SELECT SUM(b.number_of_guests)
                    FROM bookings b
                    WHERE b.listing_type = 'experience'
                      AND b.listing_id = h.id
                      AND (b.booking_status IN ('confirmed', 'pending') OR b.status IN ('confirmed', 'pending'))
                      AND b.booking_status != 'rejected'
                      AND b.status != 'rejected'
                ), 0)) AS available_capacity,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS total_reviews,
                u.id AS host_id,
                u.first_name AS host_first_name,
                u.last_name AS host_last_name,
                u.profile_picture AS host_picture,
                u.bio AS host_bio,
                u.is_verified AS host_verified
              FROM hostings h
              LEFT JOIN users u ON h.host_id = u.id
              LEFT JOIN (
                    SELECT reviewee_id,
                           AVG(stars) AS avg_rating,
                           COUNT(*) AS review_count
                    FROM reviews
                    WHERE reviewee_type = 'hosting'
                    GROUP BY reviewee_id
              ) r ON r.reviewee_id = h.id
              WHERE h.id = :id
                AND h.hosting_type = 'experience'
                AND h.is_active = 1
              LIMIT 1";

    $stmt = $db->prepare($query);
    $stmt->bindValue(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    $experience = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$experience) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Experience not found'
        ]);
        exit();
    }

    // Fetch subtypes
    $subtypeQuery = "SELECT s.name, s.description, s.icon_url
                      FROM hosting_subtypes hs
                      JOIN subtypes s ON hs.subtype_id = s.id
                      WHERE hs.hosting_id = :id";

    $subtypeStmt = $db->prepare($subtypeQuery);
    $subtypeStmt->bindValue(':id', $id, PDO::PARAM_INT);
    $subtypeStmt->execute();

    $experience['subtypes'] = $subtypeStmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch additional images (table may not exist)
    try {
        $imagesQuery = "SELECT
                            id,
                            image AS image_url,
                            category AS caption,
                            display_order,
                            is_primary
                         FROM hosting_images
                         WHERE hosting_id = :id
                         ORDER BY is_primary DESC, display_order ASC, id ASC";

        $imagesStmt = $db->prepare($imagesQuery);
        $imagesStmt->bindValue(':id', $id, PDO::PARAM_INT);
        $imagesStmt->execute();

        $experience['images'] = $imagesStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Table doesn't exist, set empty array
        $experience['images'] = [];
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
                        AND r.reviewee_type = 'hosting'
                      ORDER BY r.created_at DESC
                      LIMIT 10";

    $reviewsStmt = $db->prepare($reviewsQuery);
    $reviewsStmt->bindValue(':id', $id, PDO::PARAM_INT);
    $reviewsStmt->execute();

    $experience['reviews'] = $reviewsStmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [
        'success' => true,
        'data' => $experience
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

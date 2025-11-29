<?php
/**
 * Admin Get Listing Details API
 * Returns detailed listing information for experiences, events, or stays
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

include_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/jwt-helper.php';

try {
    $jwtHelper = new JWTHelper();
    $payload = $jwtHelper->validateToken($token);
    $adminId = $payload['user_id'];

    $database = new Database();
    $db = $database->getConnection();

    // Verify admin
    $stmt = $db->prepare("SELECT user_type FROM users WHERE id = :user_id");
    $stmt->execute(['user_id' => $adminId]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin || $admin['user_type'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit();
    }

    $listingId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $listingType = isset($_GET['type']) ? $_GET['type'] : ''; // 'experience', 'event', or 'stay'

    if (!$listingId || !in_array($listingType, ['experience', 'event', 'stay'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid listing ID and type are required']);
        exit();
    }

    $listing = null;
    $images = [];
    $subtypes = [];
    $amenities = [];

    if ($listingType === 'stay') {
        // Get stay details
        $query = "SELECT s.*,
                         CONCAT(u.first_name, ' ', u.last_name) as host_name,
                         u.email as host_email,
                         a.country, a.city, a.street, a.building, a.floor,
                         a.latitude, a.longitude
                  FROM stays s
                  LEFT JOIN users u ON s.host_id = u.id
                  LEFT JOIN addresses a ON s.address_id = a.id
                  WHERE s.id = :id";
        
        $stmt = $db->prepare($query);
        $stmt->execute(['id' => $listingId]);
        $listing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($listing) {
            // Get stay images
            $imgQuery = "SELECT id, room, image, is_primary, display_order 
                        FROM stay_images 
                        WHERE stay_id = :stay_id 
                        ORDER BY is_primary DESC, display_order ASC";
            $imgStmt = $db->prepare($imgQuery);
            $imgStmt->execute(['stay_id' => $listingId]);
            $images = $imgStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get stay amenities
            $amenQuery = "SELECT a.id, a.name, a.category 
                         FROM stay_amenities sa
                         JOIN amenities a ON sa.amenity_id = a.id
                         WHERE sa.stay_id = :stay_id";
            $amenStmt = $db->prepare($amenQuery);
            $amenStmt->execute(['stay_id' => $listingId]);
            $amenities = $amenStmt->fetchAll(PDO::FETCH_ASSOC);
        }
    } else {
        // Get hosting details (experience or event)
        $query = "SELECT h.*,
                         CONCAT(u.first_name, ' ', u.last_name) as host_name,
                         u.email as host_email,
                         a.country, a.city, a.street, a.building, a.floor,
                         a.latitude, a.longitude
                  FROM hostings h
                  LEFT JOIN users u ON h.host_id = u.id
                  LEFT JOIN addresses a ON h.address_id = a.id
                  WHERE h.id = :id AND h.hosting_type = :type";
        
        $stmt = $db->prepare($query);
        $stmt->execute(['id' => $listingId, 'type' => $listingType]);
        $listing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($listing) {
            // Get hosting images
            $imgQuery = "SELECT id, category, image, is_primary, display_order 
                        FROM hosting_images 
                        WHERE hosting_id = :hosting_id 
                        ORDER BY is_primary DESC, display_order ASC";
            $imgStmt = $db->prepare($imgQuery);
            $imgStmt->execute(['hosting_id' => $listingId]);
            $images = $imgStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get subtypes
            $subQuery = "SELECT st.id, st.name, st.category 
                        FROM hosting_subtypes hs
                        JOIN subtypes st ON hs.subtype_id = st.id
                        WHERE hs.hosting_id = :hosting_id";
            $subStmt = $db->prepare($subQuery);
            $subStmt->execute(['hosting_id' => $listingId]);
            $subtypes = $subStmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    if (!$listing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Listing not found']);
        exit();
    }

    // Add related data to listing
    $listing['images'] = $images;
    $listing['subtypes'] = $subtypes;
    $listing['amenities'] = $amenities;
    $listing['listing_type'] = $listingType;

    echo json_encode([
        'success' => true,
        'data' => $listing
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


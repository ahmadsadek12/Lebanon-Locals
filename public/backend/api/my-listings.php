<?php
/**
 * My Listings API
 * Fetches all listings for a specific host
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    include_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    $type = isset($_GET['type']) ? trim($_GET['type']) : null;
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User ID required']);
        exit();
    }
    
    if (!$type || !in_array($type, ['experience', 'event', 'stay'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid listing type']);
        exit();
    }
    
    // Verify user is a host
    $userQuery = "SELECT user_type FROM users WHERE id = :user_id";
    $userStmt = $db->prepare($userQuery);
    $userStmt->bindParam(':user_id', $userId);
    $userStmt->execute();
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || ($user['user_type'] !== 'host' && $user['user_type'] !== 'admin')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only hosts can access their listings']);
        exit();
    }
    
    if ($type === 'stay') {
        // Fetch stays
        $query = "SELECT 
                    s.id,
                    s.title,
                    s.description,
                    s.location,
                    s.price_per_night,
                    s.main_image,
                    s.max_guests,
                    s.number_of_bedrooms,
                    s.number_of_beds,
                    s.number_of_bathrooms,
                    s.property_type,
                    s.is_active,
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
                  WHERE s.host_id = :user_id
                  ORDER BY s.created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        
        $listings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'count' => count($listings),
            'data' => $listings
        ]);
        
    } else {
        // Fetch experiences or events from hostings table
        $query = "SELECT 
                    h.id,
                    h.title,
                    h.description,
                    h.location,
                    h.price,
                    h.price_per_person,
                    h.main_image,
                    h.max_guests,
                    h.length_hours,
                    h.date_start,
                    h.date_end,
                    h.is_active,
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
                  WHERE h.host_id = :user_id
                    AND h.hosting_type = :type
                  ORDER BY h.created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':type', $type);
        $stmt->execute();
        
        $listings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'count' => count($listings),
            'data' => $listings
        ]);
    }
    
} catch (Exception $e) {
    error_log("My Listings Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>


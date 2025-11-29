<?php
/**
 * Delete Listing API
 * Allows hosts to delete their own listings
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $userId = isset($input['user_id']) ? intval($input['user_id']) : null;
    $type = isset($input['type']) ? trim($input['type']) : null;
    $listingId = isset($input['id']) ? intval($input['id']) : null;
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User authentication required']);
        exit();
    }
    
    if (!$type || !in_array($type, ['experience', 'event', 'stay'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid listing type']);
        exit();
    }
    
    if (!$listingId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Listing ID required']);
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
        echo json_encode(['success' => false, 'message' => 'Only hosts can delete listings']);
        exit();
    }
    
    if ($type === 'stay') {
        // Verify ownership
        $checkQuery = "SELECT id FROM stays WHERE id = :id AND host_id = :user_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $listingId);
        $checkStmt->bindParam(':user_id', $userId);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'You do not own this listing']);
            exit();
        }
        
        // Delete reviews for this stay
        $deleteReviewsQuery = "DELETE FROM reviews WHERE reviewee_type = 'stay' AND reviewee_id = :id";
        $deleteReviewsStmt = $db->prepare($deleteReviewsQuery);
        $deleteReviewsStmt->bindParam(':id', $listingId);
        $deleteReviewsStmt->execute();
        
        // Delete stay images
        $deleteImagesQuery = "DELETE FROM stay_images WHERE stay_id = :id";
        $deleteImagesStmt = $db->prepare($deleteImagesQuery);
        $deleteImagesStmt->bindParam(':id', $listingId);
        $deleteImagesStmt->execute();
        
        // Delete stay amenities
        $deleteAmenitiesQuery = "DELETE FROM stay_amenities WHERE stay_id = :id";
        $deleteAmenitiesStmt = $db->prepare($deleteAmenitiesQuery);
        $deleteAmenitiesStmt->bindParam(':id', $listingId);
        $deleteAmenitiesStmt->execute();
        
        // Delete stay dates (availability calendar)
        $deleteDatesQuery = "DELETE FROM stay_dates WHERE stay_id = :id";
        $deleteDatesStmt = $db->prepare($deleteDatesQuery);
        $deleteDatesStmt->bindParam(':id', $listingId);
        $deleteDatesStmt->execute();
        
        // Delete the stay
        $deleteQuery = "DELETE FROM stays WHERE id = :id AND host_id = :user_id";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->bindParam(':id', $listingId);
        $deleteStmt->bindParam(':user_id', $userId);
        
        if (!$deleteStmt->execute()) {
            throw new Exception('Failed to delete stay');
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Stay deleted successfully'
        ]);
        
    } else {
        // Verify ownership (experience or event)
        $checkQuery = "SELECT id FROM hostings WHERE id = :id AND host_id = :user_id AND hosting_type = :type";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $listingId);
        $checkStmt->bindParam(':user_id', $userId);
        $checkStmt->bindParam(':type', $type);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'You do not own this listing']);
            exit();
        }
        
        // Delete reviews for this hosting
        $deleteReviewsQuery = "DELETE FROM reviews WHERE reviewee_type = 'hosting' AND reviewee_id = :id";
        $deleteReviewsStmt = $db->prepare($deleteReviewsQuery);
        $deleteReviewsStmt->bindParam(':id', $listingId);
        $deleteReviewsStmt->execute();
        
        // Delete hosting images
        $deleteImagesQuery = "DELETE FROM hosting_images WHERE hosting_id = :id";
        $deleteImagesStmt = $db->prepare($deleteImagesQuery);
        $deleteImagesStmt->bindParam(':id', $listingId);
        $deleteImagesStmt->execute();
        
        // Delete hosting subtypes
        $deleteSubtypesQuery = "DELETE FROM hosting_subtypes WHERE hosting_id = :id";
        $deleteSubtypesStmt = $db->prepare($deleteSubtypesQuery);
        $deleteSubtypesStmt->bindParam(':id', $listingId);
        $deleteSubtypesStmt->execute();
        
        // Delete the hosting
        $deleteQuery = "DELETE FROM hostings WHERE id = :id AND host_id = :user_id";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->bindParam(':id', $listingId);
        $deleteStmt->bindParam(':user_id', $userId);
        
        if (!$deleteStmt->execute()) {
            throw new Exception('Failed to delete ' . $type);
        }
        
        echo json_encode([
            'success' => true,
            'message' => ucfirst($type) . ' deleted successfully'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Delete Listing Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>


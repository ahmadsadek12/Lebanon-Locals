<?php
/**
 * Delete All Stays and All Users Except ID 24
 * This script handles foreign key constraints by deleting in the correct order
 */

// Include database connection
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

if ($db === null) {
    die("Database connection failed\n");
}

try {
    $db->beginTransaction();
    
    echo "Starting deletion process...\n\n";
    
    // ============================================
    // STEP 1: Delete all stays
    // ============================================
    echo "Step 1: Deleting all stays and related data...\n";
    
    // Break circular foreign key constraints:
    // 1. stays.dates_id references stay_dates.id
    // 2. stay_dates.stay_id references stays.id
    
    // First, set dates_id to NULL in stays (if column exists) to break constraint 1
    try {
        $stmt = $db->prepare("UPDATE stays SET dates_id = NULL WHERE dates_id IS NOT NULL");
        $stmt->execute();
        echo "  - Set dates_id to NULL in stays: " . $stmt->rowCount() . " rows\n";
    } catch (PDOException $e) {
        // Column might not exist, that's okay
        echo "  - dates_id column may not exist, skipping...\n";
    }
    
    // Set stay_id to NULL in stay_dates to break constraint 2
    try {
        $stmt = $db->prepare("UPDATE stay_dates SET stay_id = NULL WHERE stay_id IS NOT NULL");
        $stmt->execute();
        echo "  - Set stay_id to NULL in stay_dates: " . $stmt->rowCount() . " rows\n";
    } catch (PDOException $e) {
        echo "  - Error updating stay_dates: " . $e->getMessage() . "\n";
    }
    
    // Delete stay_amenities (junction table)
    $stmt = $db->prepare("DELETE FROM stay_amenities");
    $stmt->execute();
    echo "  - Deleted stay_amenities: " . $stmt->rowCount() . " rows\n";
    
    // Delete stay_subtypes (junction table)
    $stmt = $db->prepare("DELETE FROM stay_subtypes");
    $stmt->execute();
    echo "  - Deleted stay_subtypes: " . $stmt->rowCount() . " rows\n";
    
    // Delete bookings for stays
    $stmt = $db->prepare("DELETE FROM bookings WHERE listing_type = 'stay'");
    $stmt->execute();
    echo "  - Deleted bookings for stays: " . $stmt->rowCount() . " rows\n";
    
    // Delete reviews for stays
    $stmt = $db->prepare("DELETE FROM reviews WHERE reviewee_type = 'stay'");
    $stmt->execute();
    echo "  - Deleted reviews for stays: " . $stmt->rowCount() . " rows\n";
    
    // Delete wishlist items for stays
    $stmt = $db->prepare("DELETE FROM wishlist WHERE item_type = 'stay'");
    $stmt->execute();
    echo "  - Deleted wishlist items for stays: " . $stmt->rowCount() . " rows\n";
    
    // Now delete all stays (constraints are broken)
    $stmt = $db->prepare("DELETE FROM stays");
    $stmt->execute();
    echo "  - Deleted stays: " . $stmt->rowCount() . " rows\n";
    
    // Finally delete stay_dates (constraints are broken)
    $stmt = $db->prepare("DELETE FROM stay_dates");
    $stmt->execute();
    echo "  - Deleted stay_dates: " . $stmt->rowCount() . " rows\n";
    
    echo "\nStep 1 complete!\n\n";
    
    // ============================================
    // STEP 2: Delete all users except ID 24
    // ============================================
    echo "Step 2: Deleting all users except ID 24 and related data...\n";
    
    // Delete bookings by users (except user 24)
    $stmt = $db->prepare("DELETE FROM bookings WHERE user_id != 24");
    $stmt->execute();
    echo "  - Deleted bookings by users (except 24): " . $stmt->rowCount() . " rows\n";
    
    // Delete bookings for hostings owned by users (except user 24)
    $stmt = $db->prepare("DELETE FROM bookings WHERE listing_type IN ('experience', 'event') AND listing_id IN (SELECT id FROM hostings WHERE host_id != 24)");
    $stmt->execute();
    echo "  - Deleted bookings for hostings (except user 24): " . $stmt->rowCount() . " rows\n";
    
    // Delete reviews by users (except user 24)
    $stmt = $db->prepare("DELETE FROM reviews WHERE reviewer_id != 24");
    $stmt->execute();
    echo "  - Deleted reviews by users (except 24): " . $stmt->rowCount() . " rows\n";
    
    // Delete reviews for users (except user 24)
    $stmt = $db->prepare("DELETE FROM reviews WHERE reviewee_type = 'user' AND reviewee_id != 24");
    $stmt->execute();
    echo "  - Deleted reviews for users (except 24): " . $stmt->rowCount() . " rows\n";
    
    // Delete wishlist items (except user 24)
    $stmt = $db->prepare("DELETE FROM wishlist WHERE user_id != 24");
    $stmt->execute();
    echo "  - Deleted wishlist items (except user 24): " . $stmt->rowCount() . " rows\n";
    
    // Delete notifications (except user 24)
    $stmt = $db->prepare("DELETE FROM notifications WHERE `from` != 24 AND `to` != 24");
    $stmt->execute();
    echo "  - Deleted notifications (except user 24): " . $stmt->rowCount() . " rows\n";
    
    // Delete hostings owned by users (except user 24)
    // First delete related data
    $stmt = $db->prepare("DELETE FROM hosting_subtypes WHERE hosting_id IN (SELECT id FROM hostings WHERE host_id != 24)");
    $stmt->execute();
    echo "  - Deleted hosting_subtypes (except user 24): " . $stmt->rowCount() . " rows\n";
    
    // Delete hosting images if table exists
    try {
        $stmt = $db->prepare("DELETE FROM hosting_images WHERE hosting_id IN (SELECT id FROM hostings WHERE host_id != 24)");
        $stmt->execute();
        echo "  - Deleted hosting_images (except user 24): " . $stmt->rowCount() . " rows\n";
    } catch (PDOException $e) {
        echo "  - hosting_images table may not exist, skipping...\n";
    }
    
    // Delete reviews for hostings owned by users (except user 24)
    $stmt = $db->prepare("DELETE FROM reviews WHERE reviewee_type = 'hosting' AND reviewee_id IN (SELECT id FROM hostings WHERE host_id != 24)");
    $stmt->execute();
    echo "  - Deleted reviews for hostings (except user 24): " . $stmt->rowCount() . " rows\n";
    
    // Delete hostings owned by users (except user 24)
    $stmt = $db->prepare("DELETE FROM hostings WHERE host_id != 24");
    $stmt->execute();
    echo "  - Deleted hostings (except user 24): " . $stmt->rowCount() . " rows\n";
    
    // Finally, delete all users except ID 24
    $stmt = $db->prepare("DELETE FROM users WHERE id != 24");
    $stmt->execute();
    echo "  - Deleted users (except 24): " . $stmt->rowCount() . " rows\n";
    
    echo "\nStep 2 complete!\n\n";
    
    // Commit transaction
    $db->commit();
    
    echo "✅ Deletion completed successfully!\n\n";
    
    // Verification
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM stays");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Remaining stays: " . $result['count'] . "\n";
    
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM users");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Remaining users: " . $result['count'] . "\n";
    
    $stmt = $db->prepare("SELECT id, email, user_type FROM users");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Remaining user details:\n";
    foreach ($users as $user) {
        echo "  - ID: {$user['id']}, Email: {$user['email']}, Type: {$user['user_type']}\n";
    }
    
} catch (PDOException $e) {
    $db->rollBack();
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Transaction rolled back.\n";
}


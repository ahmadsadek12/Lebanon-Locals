<?php
/**
 * Lebanon Locals - Image Population Script
 * Populates database with sample images for testing
 */

// Include database connection
require_once __DIR__ . '/../config/database.php';

// Initialize database
$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "Starting image population...\n\n";

// ===================================================
// 1. POPULATE HOSTING IMAGES (experiences & events)
// ===================================================

echo "--- Populating Hosting Images ---\n";

// Sample images to use for hostings
$hostingImages = [
    'images/logos/home_page_experience_image.webp',
    'images/home_page_experience_image.jpg',
    'images/experiences.jpg',
    'images/experiences.png',
    'images/default_image.png'
];

try {
    // Get all hostings without a main image
    $stmt = $pdo->query("
        SELECT id, title, hosting_type
        FROM hostings
        WHERE id NOT IN (
            SELECT DISTINCT hosting_id
            FROM hosting_images
            WHERE is_primary = 1
        )
        ORDER BY id
    ");

    $hostings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $hostingCount = count($hostings);

    echo "Found {$hostingCount} hostings without main images\n";

    foreach ($hostings as $index => $hosting) {
        // Rotate through available images
        $image = $hostingImages[$index % count($hostingImages)];

        // Insert primary image
        $insertStmt = $pdo->prepare("
            INSERT INTO hosting_images (hosting_id, category, image, display_order, is_primary)
            VALUES (:hosting_id, 'Activity', :image, 1, 1)
        ");

        $insertStmt->execute([
            'hosting_id' => $hosting['id'],
            'image' => $image
        ]);

        echo "  ✓ Added image to hosting #{$hosting['id']}: {$hosting['title']}\n";
    }

    echo "Hosting images: {$hostingCount} records updated\n\n";

} catch (PDOException $e) {
    echo "Error populating hosting images: " . $e->getMessage() . "\n\n";
}

// ===================================================
// 2. POPULATE STAY IMAGES
// ===================================================

echo "--- Populating Stay Images ---\n";

// Sample images to use for stays
$stayImages = [
    'images/logos/home_page_stay_image.webp',
    'images/home_page_stay_image.jpg',
    'images/default_room_image.png',
    'images/default_image.png'
];

try {
    // Get all stays without a main image
    $stmt = $pdo->query("
        SELECT id, title, property_type
        FROM stays
        WHERE id NOT IN (
            SELECT DISTINCT stay_id
            FROM stay_images
            WHERE is_primary = 1
        )
        ORDER BY id
    ");

    $stays = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stayCount = count($stays);

    echo "Found {$stayCount} stays without main images\n";

    foreach ($stays as $index => $stay) {
        // Rotate through available images
        $image = $stayImages[$index % count($stayImages)];

        // Insert primary image
        $insertStmt = $pdo->prepare("
            INSERT INTO stay_images (stay_id, room, image, display_order, is_primary)
            VALUES (:stay_id, 'Exterior', :image, 1, 1)
        ");

        $insertStmt->execute([
            'stay_id' => $stay['id'],
            'image' => $image
        ]);

        echo "  ✓ Added image to stay #{$stay['id']}: {$stay['title']}\n";
    }

    echo "Stay images: {$stayCount} records updated\n\n";

} catch (PDOException $e) {
    echo "Error populating stay images: " . $e->getMessage() . "\n\n";
}

// ===================================================
// 3. POPULATE USER PROFILE PICTURES
// ===================================================

echo "--- Populating User Profile Pictures ---\n";

// Sample profile pictures
$userImages = [
    'images/default_image.png',
    'images/logos/logo.jpg'
];

try {
    // Get users without profile pictures (limit to first 10 for testing)
    $stmt = $pdo->query("
        SELECT id, first_name, last_name
        FROM users
        WHERE (profile_picture IS NULL OR profile_picture = '')
        ORDER BY id
        LIMIT 10
    ");

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $userCount = count($users);

    echo "Found {$userCount} users without profile pictures\n";

    foreach ($users as $index => $user) {
        // Rotate through available images
        $image = $userImages[$index % count($userImages)];

        // Update user profile picture
        $updateStmt = $pdo->prepare("
            UPDATE users
            SET profile_picture = :picture
            WHERE id = :user_id
        ");

        $updateStmt->execute([
            'picture' => $image,
            'user_id' => $user['id']
        ]);

        $name = trim($user['first_name'] . ' ' . $user['last_name']);
        echo "  ✓ Added profile picture to user #{$user['id']}: {$name}\n";
    }

    echo "User profile pictures: {$userCount} records updated\n\n";

} catch (PDOException $e) {
    echo "Error populating user profile pictures: " . $e->getMessage() . "\n\n";
}

// ===================================================
// 4. SUMMARY
// ===================================================

echo "=================================\n";
echo "Image Population Complete!\n";
echo "=================================\n";
echo "Hostings updated: {$hostingCount}\n";
echo "Stays updated: {$stayCount}\n";
echo "User profiles updated: {$userCount}\n";
echo "=================================\n";

?>

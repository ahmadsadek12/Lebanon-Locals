<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "=================================\n";
echo "Fixing Stay Images with Missing Directories\n";
echo "=================================\n\n";

// Placeholder images to use
$placeholderImages = [
    'images/logos/home_page_stay_image.webp',
    'images/home_page_stay_image.jpg',
    'images/default_room_image.png',
    'images/default_image.png'
];

$fixedCount = 0;

try {
    // Get all stays with broken image paths
    $stmt = $pdo->query("
        SELECT DISTINCT si.stay_id, s.title
        FROM stay_images si
        JOIN stays s ON s.id = si.stay_id
        WHERE si.is_primary = 1
    ");

    $stays = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($stays as $index => $stay) {
        // Check if the primary image exists
        $checkStmt = $pdo->prepare("
            SELECT image
            FROM stay_images
            WHERE stay_id = :stay_id AND is_primary = 1
            LIMIT 1
        ");
        $checkStmt->execute(['stay_id' => $stay['stay_id']]);
        $currentImage = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($currentImage) {
            $imagePath = __DIR__ . '/../../' . $currentImage['image'];

            if (!file_exists($imagePath)) {
                // Use placeholder image
                $placeholder = $placeholderImages[$index % count($placeholderImages)];

                // Delete all old images for this stay
                $deleteStmt = $pdo->prepare("DELETE FROM stay_images WHERE stay_id = :stay_id");
                $deleteStmt->execute(['stay_id' => $stay['stay_id']]);

                // Insert new placeholder image
                $insertStmt = $pdo->prepare("
                    INSERT INTO stay_images (stay_id, room, image, display_order, is_primary)
                    VALUES (:stay_id, 'Exterior', :image, 1, 1)
                ");

                $insertStmt->execute([
                    'stay_id' => $stay['stay_id'],
                    'image' => $placeholder
                ]);

                echo "✓ Fixed stay #{$stay['stay_id']}: {$stay['title']}\n";
                echo "  New image: {$placeholder}\n\n";
                $fixedCount++;
            }
        }
    }

    echo "=================================\n";
    echo "Summary: Fixed {$fixedCount} stays\n";
    echo "=================================\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

?>

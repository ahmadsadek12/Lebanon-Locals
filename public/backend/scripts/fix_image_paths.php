<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "=================================\n";
echo "Fixing Broken Image Paths\n";
echo "=================================\n\n";

$fixedCount = 0;
$errorCount = 0;

try {
    // Get all hosting images
    $stmt = $pdo->query("
        SELECT hi.id, hi.hosting_id, hi.image, hi.is_primary
        FROM hosting_images hi
        ORDER BY hi.hosting_id, hi.is_primary DESC
    ");

    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($images as $image) {
        $imagePath = __DIR__ . '/../../' . $image['image'];

        // Check if file exists
        if (!file_exists($imagePath)) {
            echo "❌ Missing: {$image['image']}\n";

            // Try to fix by finding the directory
            if (preg_match('/images\/host_experiences\/(\d+)\//', $image['image'], $matches)) {
                $directory = $matches[1];
                $dirPath = __DIR__ . '/../../images/host_experiences/' . $directory . '/';

                if (is_dir($dirPath)) {
                    // Get first image in directory
                    $files = scandir($dirPath);
                    $imageFiles = array_filter($files, function($file) use ($dirPath) {
                        return is_file($dirPath . $file) && preg_match('/\.(jpg|jpeg|png|webp|gif)$/i', $file);
                    });

                    if (count($imageFiles) > 0) {
                        // Get first resize image if available, otherwise first image
                        $resizeImages = array_filter($imageFiles, function($file) {
                            return strpos($file, '_resize') !== false || strpos($file, '0_') === 0 || strpos($file, '1') === 0;
                        });

                        $selectedImage = count($resizeImages) > 0 ? reset($resizeImages) : reset($imageFiles);
                        $newPath = "images/host_experiences/{$directory}/{$selectedImage}";

                        // Update database
                        $updateStmt = $pdo->prepare("
                            UPDATE hosting_images
                            SET image = :new_path
                            WHERE id = :id
                        ");

                        $updateStmt->execute([
                            'new_path' => $newPath,
                            'id' => $image['id']
                        ]);

                        echo "  ✓ Fixed to: {$newPath}\n";
                        $fixedCount++;
                    } else {
                        echo "  ⚠ No images found in directory {$directory}\n";
                        $errorCount++;
                    }
                } else {
                    echo "  ⚠ Directory not found: {$directory}\n";
                    $errorCount++;
                }
            } else {
                echo "  ⚠ Could not extract directory from path\n";
                $errorCount++;
            }
            echo "\n";
        }
    }

    echo "=================================\n";
    echo "Hosting Images Summary:\n";
    echo "  Fixed: {$fixedCount}\n";
    echo "  Errors: {$errorCount}\n";
    echo "=================================\n\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Now fix stay images
echo "=================================\n";
echo "Fixing Stay Image Paths\n";
echo "=================================\n\n";

$stayFixedCount = 0;
$stayErrorCount = 0;

try {
    // Get all stay images
    $stmt = $pdo->query("
        SELECT si.id, si.stay_id, si.image, si.is_primary
        FROM stay_images si
        ORDER BY si.stay_id, si.is_primary DESC
    ");

    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($images as $image) {
        $imagePath = __DIR__ . '/../../' . $image['image'];

        // Check if file exists
        if (!file_exists($imagePath)) {
            echo "❌ Missing: {$image['image']}\n";

            // Try to fix by finding the directory
            if (preg_match('/images\/rooms\/(\d+)\//', $image['image'], $matches)) {
                $directory = $matches[1];
                $dirPath = __DIR__ . '/../../images/rooms/' . $directory . '/';

                if (is_dir($dirPath)) {
                    // Get first image in directory
                    $files = scandir($dirPath);
                    $imageFiles = array_filter($files, function($file) use ($dirPath) {
                        return is_file($dirPath . $file) && preg_match('/\.(jpg|jpeg|png|webp|gif)$/i', $file);
                    });

                    if (count($imageFiles) > 0) {
                        $selectedImage = reset($imageFiles);
                        $newPath = "images/rooms/{$directory}/{$selectedImage}";

                        // Update database
                        $updateStmt = $pdo->prepare("
                            UPDATE stay_images
                            SET image = :new_path
                            WHERE id = :id
                        ");

                        $updateStmt->execute([
                            'new_path' => $newPath,
                            'id' => $image['id']
                        ]);

                        echo "  ✓ Fixed to: {$newPath}\n";
                        $stayFixedCount++;
                    } else {
                        echo "  ⚠ No images found in directory {$directory}\n";
                        $stayErrorCount++;
                    }
                } else {
                    echo "  ⚠ Directory not found: {$directory}\n";
                    $stayErrorCount++;
                }
            } else {
                echo "  ⚠ Could not extract directory from path\n";
                $stayErrorCount++;
            }
            echo "\n";
        }
    }

    echo "=================================\n";
    echo "Stay Images Summary:\n";
    echo "  Fixed: {$stayFixedCount}\n";
    echo "  Errors: {$stayErrorCount}\n";
    echo "=================================\n\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "=================================\n";
echo "Overall Summary:\n";
echo "  Total Fixed: " . ($fixedCount + $stayFixedCount) . "\n";
echo "  Total Errors: " . ($errorCount + $stayErrorCount) . "\n";
echo "=================================\n";

?>

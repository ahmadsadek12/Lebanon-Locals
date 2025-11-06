<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "=================================\n";
echo "Finding Hostings with Missing Images\n";
echo "=================================\n\n";

try {
    // Get all hostings with their images
    $stmt = $pdo->query("
        SELECT
            h.id,
            h.title,
            hi.id as image_id,
            hi.image as image_path,
            hi.is_primary
        FROM hostings h
        LEFT JOIN hosting_images hi ON h.id = hi.hosting_id
        WHERE hi.is_primary = 1
        ORDER BY h.id
    ");

    $hostings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $missingCount = 0;
    $existingCount = 0;

    foreach ($hostings as $hosting) {
        $filePath = __DIR__ . '/../../' . $hosting['image_path'];
        $exists = file_exists($filePath);

        if (!$exists) {
            $missingCount++;
            echo "❌ Hosting #{$hosting['id']}: {$hosting['title']}\n";
            echo "   Missing: {$hosting['image_path']}\n\n";
        } else {
            $existingCount++;
        }
    }

    echo "\n=================================\n";
    echo "Summary:\n";
    echo "  Total hostings with images: " . count($hostings) . "\n";
    echo "  Images exist: {$existingCount}\n";
    echo "  Images missing: {$missingCount}\n";
    echo "=================================\n\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Check available image directories
echo "=================================\n";
echo "Available Image Directories\n";
echo "=================================\n\n";

$imageDir = __DIR__ . '/../../images/host_experiences/';
if (is_dir($imageDir)) {
    $dirs = scandir($imageDir);
    $validDirs = array_filter($dirs, function($dir) use ($imageDir) {
        return $dir !== '.' && $dir !== '..' && is_dir($imageDir . $dir);
    });

    echo "Found " . count($validDirs) . " directories:\n";
    foreach ($validDirs as $dir) {
        $files = scandir($imageDir . $dir);
        $imageFiles = array_filter($files, function($file) {
            return preg_match('/\.(jpg|jpeg|png|webp|gif)$/i', $file);
        });

        if (count($imageFiles) > 0) {
            echo "  {$dir}: " . count($imageFiles) . " images\n";
            // Show first image
            foreach ($imageFiles as $file) {
                echo "    - {$file}\n";
                break;
            }
        }
    }
}

?>

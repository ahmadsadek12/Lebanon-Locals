<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

// Check specific hosting ID 19
echo "=================================\n";
echo "Checking Hosting ID 19\n";
echo "=================================\n\n";

try {
    // Get hosting details
    $stmt = $pdo->prepare("SELECT * FROM hostings WHERE id = 19");
    $stmt->execute();
    $hosting = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($hosting) {
        echo "Hosting Details:\n";
        echo "  ID: {$hosting['id']}\n";
        echo "  Title: {$hosting['title']}\n";
        echo "  Type: {$hosting['hosting_type']}\n\n";
    } else {
        echo "Hosting ID 19 not found!\n";
        exit;
    }

    // Check hosting_images table
    $stmt = $pdo->prepare("
        SELECT * FROM hosting_images
        WHERE hosting_id = 19
        ORDER BY is_primary DESC, display_order ASC
    ");
    $stmt->execute();
    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Images in hosting_images table:\n";
    if (count($images) > 0) {
        foreach ($images as $img) {
            echo "  - ID: {$img['id']}\n";
            echo "    Image: {$img['image']}\n";
            echo "    Category: {$img['category']}\n";
            echo "    Primary: " . ($img['is_primary'] ? 'YES' : 'NO') . "\n";
            echo "    Display Order: {$img['display_order']}\n";

            // Check if file exists
            $filePath = __DIR__ . '/../../' . $img['image'];
            $exists = file_exists($filePath) ? 'EXISTS' : 'NOT FOUND';
            echo "    File Status: {$exists}\n";
            echo "    Full Path: {$filePath}\n\n";
        }
    } else {
        echo "  No images found in hosting_images table!\n\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Now check what the API returns
echo "=================================\n";
echo "API Response Check\n";
echo "=================================\n\n";

try {
    $stmt = $pdo->prepare("
        SELECT
            h.*,
            GROUP_CONCAT(
                DISTINCT st.subtype_name
                ORDER BY st.subtype_name
                SEPARATOR ','
            ) as subtypes,
            (
                SELECT hi.image
                FROM hosting_images hi
                WHERE hi.hosting_id = h.id
                AND hi.is_primary = 1
                LIMIT 1
            ) as main_image,
            COALESCE(AVG(r.stars), 0) as average_rating,
            COUNT(DISTINCT r.id) as total_reviews
        FROM hostings h
        LEFT JOIN hosting_subtypes hs ON h.id = hs.hosting_id
        LEFT JOIN subtypes st ON hs.subtype_id = st.id
        LEFT JOIN reviews r ON h.id = r.hosting_id AND r.is_approved = 1
        WHERE h.id = 19
        GROUP BY h.id
    ");

    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo "Main Image Returned by API: ";
        if ($result['main_image']) {
            echo $result['main_image'] . "\n";

            // Check if file exists
            $filePath = __DIR__ . '/../../' . $result['main_image'];
            $exists = file_exists($filePath) ? 'EXISTS' : 'NOT FOUND';
            echo "File Status: {$exists}\n";
            echo "Full Path: {$filePath}\n";
        } else {
            echo "NULL (no main image found!)\n";
        }
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n=================================\n";
echo "Checking ALL Hostings Without Images\n";
echo "=================================\n\n";

try {
    $stmt = $pdo->query("
        SELECT h.id, h.title, h.hosting_type
        FROM hostings h
        WHERE h.id NOT IN (
            SELECT DISTINCT hosting_id
            FROM hosting_images
            WHERE is_primary = 1
        )
        ORDER BY h.id
        LIMIT 10
    ");

    $hostings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($hostings) > 0) {
        echo "Found " . count($hostings) . " hostings without main images:\n";
        foreach ($hostings as $h) {
            echo "  ID {$h['id']}: {$h['title']} ({$h['hosting_type']})\n";
        }
    } else {
        echo "All hostings have main images!\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

?>

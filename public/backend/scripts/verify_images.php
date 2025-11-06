<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "=================================\n";
echo "Image Population Verification\n";
echo "=================================\n\n";

// Check Hostings
try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM hostings");
    $totalHostings = $stmt->fetch()['total'];

    $stmt = $pdo->query("SELECT COUNT(DISTINCT hosting_id) as with_images FROM hosting_images WHERE is_primary = 1");
    $hostingsWithImages = $stmt->fetch()['with_images'];

    echo "HOSTINGS (Experiences & Events):\n";
    echo "  Total: {$totalHostings}\n";
    echo "  With images: {$hostingsWithImages}\n";
    echo "  Without images: " . ($totalHostings - $hostingsWithImages) . "\n";
    echo "  Coverage: " . round(($hostingsWithImages / max($totalHostings, 1)) * 100, 1) . "%\n\n";
} catch (PDOException $e) {
    echo "Error checking hostings: " . $e->getMessage() . "\n\n";
}

// Check Stays
try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM stays");
    $totalStays = $stmt->fetch()['total'];

    $stmt = $pdo->query("SELECT COUNT(DISTINCT stay_id) as with_images FROM stay_images WHERE is_primary = 1");
    $staysWithImages = $stmt->fetch()['with_images'];

    echo "STAYS:\n";
    echo "  Total: {$totalStays}\n";
    echo "  With images: {$staysWithImages}\n";
    echo "  Without images: " . ($totalStays - $staysWithImages) . "\n";
    echo "  Coverage: " . round(($staysWithImages / max($totalStays, 1)) * 100, 1) . "%\n\n";
} catch (PDOException $e) {
    echo "Error checking stays: " . $e->getMessage() . "\n\n";
}

// Check Users
try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
    $totalUsers = $stmt->fetch()['total'];

    $stmt = $pdo->query("SELECT COUNT(*) as with_pictures FROM users WHERE profile_picture IS NOT NULL AND profile_picture != ''");
    $usersWithPictures = $stmt->fetch()['with_pictures'];

    echo "USERS:\n";
    echo "  Total: {$totalUsers}\n";
    echo "  With profile pictures: {$usersWithPictures}\n";
    echo "  Without pictures: " . ($totalUsers - $usersWithPictures) . "\n";
    echo "  Coverage: " . round(($usersWithPictures / max($totalUsers, 1)) * 100, 1) . "%\n\n";
} catch (PDOException $e) {
    echo "Error checking users: " . $e->getMessage() . "\n\n";
}

// Sample images
echo "=================================\n";
echo "Sample Images\n";
echo "=================================\n\n";

try {
    echo "Sample Hosting Images:\n";
    $stmt = $pdo->query("
        SELECT h.id, h.title, hi.image
        FROM hostings h
        JOIN hosting_images hi ON h.id = hi.hosting_id
        WHERE hi.is_primary = 1
        LIMIT 5
    ");
    $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($samples as $sample) {
        echo "  #{$sample['id']}: {$sample['title']}\n";
        echo "    Image: {$sample['image']}\n";
    }
    echo "\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n\n";
}

try {
    echo "Sample Stay Images:\n";
    $stmt = $pdo->query("
        SELECT s.id, s.title, si.image
        FROM stays s
        JOIN stay_images si ON s.id = si.stay_id
        WHERE si.is_primary = 1
        LIMIT 5
    ");
    $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($samples as $sample) {
        echo "  #{$sample['id']}: {$sample['title']}\n";
        echo "    Image: {$sample['image']}\n";
    }
    echo "\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n\n";
}

echo "=================================\n";
?>

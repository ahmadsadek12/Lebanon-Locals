<?php
/**
 * Update User Profile Data Script
 * Adds bio, languages, and other profile information to users
 */

require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "=================================\n";
echo "Updating User Profile Data\n";
echo "=================================\n\n";

try {
    // Sample bios
    $bios = [
        "I'm a passionate local guide who loves sharing the beauty and culture of Lebanon with visitors from around the world. With years of experience in hospitality, I ensure every guest has an authentic and memorable experience.",
        "Born and raised in Lebanon, I've spent the last 5 years helping travelers discover the hidden gems of our beautiful country. I speak multiple languages and love meeting people from different cultures.",
        "As a professional tour guide and host, I take pride in creating unique experiences that showcase the best of Lebanese culture, cuisine, and hospitality. Let me help you create unforgettable memories!",
        "I'm a local expert with deep roots in Lebanon's tourism industry. My goal is to provide guests with exceptional experiences while sharing the stories and traditions that make our country special.",
        "Hospitality is in my blood! I've been hosting travelers for years and love nothing more than seeing the joy on their faces as they discover Lebanon's treasures."
    ];

    $languages = [
        "Arabic, English, French",
        "Arabic, English",
        "Arabic, English, Spanish",
        "Arabic, English, French, German",
        "Arabic, English, Italian"
    ];

    // Update Ahmad Hassan (id=1) with complete profile
    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            bio = :bio,
            languages_spoken = :languages,
            is_verified = 1
        WHERE id = :user_id
    ");

    $updateStmt->execute([
        'bio' => $bios[0],
        'languages' => $languages[0],
        'user_id' => 1
    ]);

    echo "✓ Updated Ahmad Hassan's profile\n";

    // Update other hosts if they exist
    $hostsStmt = $pdo->query("
        SELECT id, first_name, last_name
        FROM users
        WHERE user_type = 'host'
        AND id > 1
        LIMIT 10
    ");
    $hosts = $hostsStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($hosts as $index => $host) {
        $bioIndex = ($index + 1) % count($bios);
        $langIndex = ($index + 1) % count($languages);

        $updateStmt->execute([
            'bio' => $bios[$bioIndex],
            'languages' => $languages[$langIndex],
            'user_id' => $host['id']
        ]);

        echo "✓ Updated {$host['first_name']} {$host['last_name']}'s profile\n";
    }

    echo "\n=================================\n";
    echo "✓ Profile data updated successfully!\n";
    echo "=================================\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

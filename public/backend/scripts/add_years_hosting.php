<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "=================================\n";
echo "Adding years_hosting Column\n";
echo "=================================\n\n";

try {
    // Check if column exists
    $checkStmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'years_hosting'");
    $exists = $checkStmt->fetch();

    if ($exists) {
        echo "Column 'years_hosting' already exists!\n";
    } else {
        // Add the column
        $pdo->exec("ALTER TABLE users ADD COLUMN years_hosting INT DEFAULT NULL AFTER created_at");
        echo "✓ Column 'years_hosting' added successfully!\n\n";
    }

    // Update existing users with realistic years_hosting values
    echo "Updating users with years_hosting values...\n";

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET years_hosting = :years
        WHERE id = :user_id
        AND user_type = 'host'
    ");

    // Get all hosts
    $hostsStmt = $pdo->query("SELECT id FROM users WHERE user_type = 'host'");
    $hosts = $hostsStmt->fetchAll(PDO::FETCH_COLUMN);

    $count = 0;
    foreach ($hosts as $hostId) {
        // Random years between 1 and 5
        $years = rand(1, 5);

        $updateStmt->execute([
            'years' => $years,
            'user_id' => $hostId
        ]);
        $count++;
    }

    echo "✓ Updated {$count} hosts with years_hosting\n";

    echo "\n=================================\n";
    echo "Complete!\n";
    echo "=================================\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

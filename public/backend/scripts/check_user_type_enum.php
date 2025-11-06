<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

// Get column information
$stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'user_type'");
$column = $stmt->fetch(PDO::FETCH_ASSOC);

echo "user_type Column Information:\n";
echo "============================\n";
print_r($column);
echo "\n";

// Get existing user types
$stmt = $pdo->query("SELECT DISTINCT user_type FROM users");
$userTypes = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo "Existing user_type values in database:\n";
echo "============================\n";
foreach ($userTypes as $type) {
    echo "- " . ($type ?: '(NULL)') . "\n";
}
?>

<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

// Get table structure
$stmt = $pdo->query("DESCRIBE reviews");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Reviews Table Structure:\n";
echo "============================\n";
foreach ($columns as $column) {
    printf("%-25s %-30s %s\n", $column['Field'], $column['Type'], $column['Null']);
}
?>

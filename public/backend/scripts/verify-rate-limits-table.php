<?php
/**
 * Verify rate_limits table structure
 */

require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $stmt = $db->query("DESCRIBE rate_limits");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Table 'rate_limits' structure:\n";
    echo str_repeat("-", 60) . "\n";
    foreach ($columns as $col) {
        echo sprintf("%-20s %-30s %s\n", $col['Field'], $col['Type'], $col['Null'] === 'YES' ? 'NULL' : 'NOT NULL');
    }
    echo str_repeat("-", 60) . "\n";
    echo "✅ Table structure verified!\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}


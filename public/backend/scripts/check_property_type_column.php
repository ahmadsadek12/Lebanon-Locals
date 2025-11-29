<?php
/**
 * Check the actual column definition for property_type in stays table
 */

include_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed\n");
}

try {
    // Get column information
    $query = "SHOW COLUMNS FROM stays WHERE Field = 'property_type'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $column = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($column) {
        echo "Column: property_type\n";
        echo "Type: " . $column['Type'] . "\n";
        echo "Null: " . $column['Null'] . "\n";
        echo "Key: " . $column['Key'] . "\n";
        echo "Default: " . ($column['Default'] ?? 'NULL') . "\n";
        echo "Extra: " . $column['Extra'] . "\n";
        
        // Extract size if it's a VARCHAR
        if (preg_match('/varchar\((\d+)\)/i', $column['Type'], $matches)) {
            echo "\nVARCHAR size: " . $matches[1] . " characters\n";
        } elseif (preg_match('/char\((\d+)\)/i', $column['Type'], $matches)) {
            echo "\nCHAR size: " . $matches[1] . " characters\n";
        } elseif (stripos($column['Type'], 'enum') !== false) {
            echo "\nENUM type - allowed values:\n";
            preg_match_all("/'([^']+)'/", $column['Type'], $enumValues);
            foreach ($enumValues[1] as $value) {
                echo "  - " . $value . "\n";
            }
        }
    } else {
        echo "Column 'property_type' not found in stays table\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>


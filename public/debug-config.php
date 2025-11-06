<?php
header("Content-Type: text/plain");

echo "=== Debugging Configuration ===\n\n";

// Check if env.local.php exists
$envLocal = __DIR__ . '/backend/config/env.local.php';
$envDefault = __DIR__ . '/backend/config/env.php';

echo "env.local.php path: $envLocal\n";
echo "env.local.php exists: " . (file_exists($envLocal) ? 'YES' : 'NO') . "\n\n";

echo "env.php path: $envDefault\n";
echo "env.php exists: " . (file_exists($envDefault) ? 'YES' : 'NO') . "\n\n";

// Try to load the config
if (file_exists($envLocal)) {
    echo "Loading env.local.php...\n";
    $config = include $envLocal;
    echo "Config loaded:\n";
    print_r($config);
    echo "\nPassword is: '" . $config['DB_PASSWORD'] . "'\n";
    echo "Password length: " . strlen($config['DB_PASSWORD']) . " characters\n";
} else {
    echo "env.local.php NOT FOUND!\n";
}

// Now test database connection
echo "\n=== Testing Database Connection ===\n";
include_once __DIR__ . '/backend/config/database.php';

$db = new Database();
$conn = $db->getConnection();

if ($conn) {
    echo "✅ SUCCESS! Database connected!\n";
} else {
    echo "❌ FAILED! Could not connect to database\n";
}


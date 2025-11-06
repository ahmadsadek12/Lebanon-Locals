<?php
/**
 * Direct API test - no includes, just raw output
 */

header("Content-Type: text/plain");

echo "PHP is working!\n";
echo "PHP Version: " . phpversion() . "\n";

// Test database connection
try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=lebanon_locals;charset=utf8mb4", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Database connected!\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM hostings WHERE hosting_type = 'experience'");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Experiences in DB: " . $result['count'] . "\n";
    
    // Fetch one
    $stmt = $pdo->query("SELECT title, price FROM hostings WHERE hosting_type = 'experience' LIMIT 1");
    $exp = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Sample: " . $exp['title'] . " - $" . $exp['price'] . "\n";
    
    echo "\n=== JSON Output ===\n";
    header("Content-Type: application/json");
    echo json_encode(['success' => true, 'message' => 'It works!', 'data' => $exp]);
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString();
}


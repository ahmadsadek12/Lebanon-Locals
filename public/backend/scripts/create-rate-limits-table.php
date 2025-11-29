<?php
/**
 * Create rate_limits table
 * Run this script to create the rate_limits table for rate limiting functionality
 */

require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $sql = "CREATE TABLE IF NOT EXISTS rate_limits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL COMMENT 'User ID, email, or IP address',
        endpoint VARCHAR(100) NOT NULL COMMENT 'API endpoint name',
        ip_address VARCHAR(45) NOT NULL COMMENT 'IP address of request',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_identifier_endpoint (identifier, endpoint),
        INDEX idx_created_at (created_at),
        INDEX idx_ip_endpoint (ip_address, endpoint)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $db->exec($sql);
    
    echo "✅ Table 'rate_limits' created successfully!\n";
    
    // Verify table exists
    $stmt = $db->query("SHOW TABLES LIKE 'rate_limits'");
    if ($stmt->rowCount() > 0) {
        echo "✅ Verification: Table exists in database.\n";
    } else {
        echo "❌ Warning: Table creation may have failed.\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error creating table: " . $e->getMessage() . "\n";
    exit(1);
}


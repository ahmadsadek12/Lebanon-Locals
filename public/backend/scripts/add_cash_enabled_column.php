<?php
/**
 * Add cash_enabled column to hostings and stays tables
 */

require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    echo "Adding cash_enabled column to hostings table...\n";
    $sql = "ALTER TABLE hostings ADD COLUMN cash_enabled BOOLEAN DEFAULT TRUE AFTER price_per_person";
    $db->exec($sql);
    echo "✓ Added cash_enabled to hostings table\n";

    echo "Adding cash_enabled column to stays table...\n";
    $sql = "ALTER TABLE stays ADD COLUMN cash_enabled BOOLEAN DEFAULT TRUE AFTER price_per_night";
    $db->exec($sql);
    echo "✓ Added cash_enabled to stays table\n";

    echo "\nSuccessfully added cash_enabled column to both tables!\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

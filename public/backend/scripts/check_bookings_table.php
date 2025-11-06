<?php
/**
 * Check bookings table schema
 */

require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    echo "=== BOOKINGS TABLE SCHEMA ===\n\n";

    $stmt = $db->query("DESCRIBE bookings");
    $fields = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($fields as $field) {
        echo sprintf(
            "%-25s %-20s %-10s %-15s %s\n",
            $field['Field'],
            $field['Type'],
            $field['Null'],
            $field['Key'],
            $field['Default']
        );
    }

    echo "\n=== SAMPLE BOOKING DATA ===\n\n";

    $stmt = $db->query("SELECT * FROM bookings LIMIT 1");
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($booking) {
        foreach ($booking as $key => $value) {
            echo "$key: $value\n";
        }
    } else {
        echo "No bookings found in the table.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

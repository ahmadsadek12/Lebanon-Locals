<?php
/**
 * Update bookings table to include all necessary fields
 */

require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    echo "Updating bookings table schema...\n\n";

    // Add host_id if it doesn't exist
    echo "1. Adding host_id column...\n";
    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN host_id INT AFTER user_id");
        echo "✓ Added host_id\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ host_id already exists\n";
        } else {
            throw $e;
        }
    }

    // Add listing_type and listing_id
    echo "2. Adding listing_type and listing_id columns...\n";
    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN listing_type ENUM('experience', 'event', 'stay') AFTER host_id");
        echo "✓ Added listing_type\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ listing_type already exists\n";
        } else {
            throw $e;
        }
    }

    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN listing_id INT AFTER listing_type");
        echo "✓ Added listing_id\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ listing_id already exists\n";
        } else {
            throw $e;
        }
    }

    // Add start_date and end_date (keeping old ones for compatibility)
    echo "3. Adding start_date and end_date columns...\n";
    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN start_date DATE AFTER listing_id");
        echo "✓ Added start_date\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ start_date already exists\n";
        } else {
            throw $e;
        }
    }

    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN end_date DATE AFTER start_date");
        echo "✓ Added end_date\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ end_date already exists\n";
        } else {
            throw $e;
        }
    }

    // Add guests column
    echo "4. Adding guests column...\n";
    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN guests INT DEFAULT 1 AFTER end_date");
        echo "✓ Added guests\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ guests already exists\n";
        } else {
            throw $e;
        }
    }

    // Add guest contact fields
    echo "5. Adding guest_email and guest_phone columns...\n";
    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN guest_email VARCHAR(255) AFTER payment_method");
        echo "✓ Added guest_email\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ guest_email already exists\n";
        } else {
            throw $e;
        }
    }

    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN guest_phone VARCHAR(20) AFTER guest_email");
        echo "✓ Added guest_phone\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ guest_phone already exists\n";
        } else {
            throw $e;
        }
    }

    // Add status column (separate from booking_status for clarity)
    echo "6. Adding status column...\n";
    try {
        $db->exec("ALTER TABLE bookings ADD COLUMN status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending' AFTER guest_phone");
        echo "✓ Added status\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "✓ status already exists\n";
        } else {
            throw $e;
        }
    }

    // Modify user_id to be nullable (for guest bookings)
    echo "7. Making user_id nullable for guest bookings...\n";
    try {
        $db->exec("ALTER TABLE bookings MODIFY COLUMN user_id INT NULL");
        echo "✓ Modified user_id to be nullable\n";
    } catch (PDOException $e) {
        echo "Note: " . $e->getMessage() . "\n";
    }

    echo "\n✅ Successfully updated bookings table schema!\n";

    // Show updated schema
    echo "\n=== UPDATED BOOKINGS TABLE SCHEMA ===\n\n";
    $stmt = $db->query("DESCRIBE bookings");
    $fields = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($fields as $field) {
        echo sprintf(
            "%-25s %-30s %-10s\n",
            $field['Field'],
            $field['Type'],
            $field['Null']
        );
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

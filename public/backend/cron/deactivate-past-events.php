<?php
/**
 * Deactivate Past Events
 * This script sets is_active = 0 for events whose date_end has passed
 * Should be run as a daily cron job
 */

require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    if ($db === null) {
        throw new Exception('Database connection failed');
    }

    // Get current datetime
    $now = date('Y-m-d H:i:s');

    // Deactivate events where date_end has passed
    $query = "UPDATE hostings 
              SET is_active = 0, 
                  updated_at = NOW()
              WHERE hosting_type = 'event'
                AND is_active = 1
                AND (
                    -- If event has end date, check if it passed
                    (date_end IS NOT NULL AND date_end < :now1)
                    OR
                    -- If no end date, use start date
                    (date_end IS NULL AND date_start IS NOT NULL AND date_start < :now2)
                )";

    $stmt = $db->prepare($query);
    $stmt->bindValue(':now1', $now, PDO::PARAM_STR);
    $stmt->bindValue(':now2', $now, PDO::PARAM_STR);
    $stmt->execute();

    $deactivatedCount = $stmt->rowCount();

    // Log the result
    error_log("[CRON] Deactivated {$deactivatedCount} past events at {$now}");

    echo json_encode([
        'success' => true,
        'message' => "Deactivated {$deactivatedCount} past events",
        'count' => $deactivatedCount,
        'timestamp' => $now
    ]);

} catch (Exception $e) {
    error_log("[CRON ERROR] Failed to deactivate past events: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>


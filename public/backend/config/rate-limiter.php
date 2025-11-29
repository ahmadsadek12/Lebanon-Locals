<?php
/**
 * Rate Limiter Class
 * Prevents API abuse and brute force attacks
 */

class RateLimiter {
    private $db;
    private $maxRequests;
    private $timeWindow;
    
    public function __construct($db, $maxRequests = 60, $timeWindow = 60) {
        $this->db = $db;
        $this->maxRequests = $maxRequests; // Max requests
        $this->timeWindow = $timeWindow; // Time window in seconds
    }
    
    /**
     * Check if request is within rate limit
     * @param string $identifier User ID, email, or IP address
     * @param string $endpoint Endpoint name (e.g., 'login', 'register')
     * @return bool True if allowed, exits with 429 if exceeded
     */
    public function checkLimit($identifier = null, $endpoint = 'general') {
        // Use identifier if provided, otherwise use IP
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key = $identifier ?: $ip;
        
        // Clean old entries first (older than time window)
        $this->cleanOldEntries();
        
        // Count requests in time window
        $query = "SELECT COUNT(*) as count 
                  FROM rate_limits 
                  WHERE identifier = :key 
                  AND endpoint = :endpoint 
                  AND created_at > DATE_SUB(NOW(), INTERVAL :window SECOND)";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':key' => $key,
            ':endpoint' => $endpoint,
            ':window' => $this->timeWindow
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $count = intval($result['count']);
        
        if ($count >= $this->maxRequests) {
            // Calculate retry after
            $oldestQuery = "SELECT created_at FROM rate_limits 
                           WHERE identifier = :key AND endpoint = :endpoint 
                           ORDER BY created_at ASC LIMIT 1";
            $oldestStmt = $this->db->prepare($oldestQuery);
            $oldestStmt->execute([':key' => $key, ':endpoint' => $endpoint]);
            $oldest = $oldestStmt->fetch(PDO::FETCH_ASSOC);
            
            $retryAfter = $this->timeWindow;
            if ($oldest) {
                $oldestTime = strtotime($oldest['created_at']);
                $retryAfter = max(1, $this->timeWindow - (time() - $oldestTime));
            }
            
            http_response_code(429);
            header("Retry-After: $retryAfter");
            echo json_encode([
                'success' => false,
                'message' => 'Rate limit exceeded. Please try again later.',
                'retry_after' => $retryAfter
            ]);
            exit();
        }
        
        // Record this request
        $insertQuery = "INSERT INTO rate_limits (identifier, endpoint, ip_address, created_at) 
                        VALUES (:key, :endpoint, :ip, NOW())";
        $insertStmt = $this->db->prepare($insertQuery);
        $insertStmt->execute([
            ':key' => $key,
            ':endpoint' => $endpoint,
            ':ip' => $ip
        ]);
        
        return true;
    }
    
    /**
     * Clean old rate limit entries
     */
    private function cleanOldEntries() {
        // Delete entries older than 2x time window
        $cleanupQuery = "DELETE FROM rate_limits 
                        WHERE created_at < DATE_SUB(NOW(), INTERVAL :window SECOND)";
        $cleanupStmt = $this->db->prepare($cleanupQuery);
        $cleanupStmt->execute([':window' => $this->timeWindow * 2]);
    }
    
    /**
     * Get remaining requests for identifier
     */
    public function getRemaining($identifier, $endpoint = 'general') {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key = $identifier ?: $ip;
        
        $query = "SELECT COUNT(*) as count 
                  FROM rate_limits 
                  WHERE identifier = :key 
                  AND endpoint = :endpoint 
                  AND created_at > DATE_SUB(NOW(), INTERVAL :window SECOND)";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':key' => $key,
            ':endpoint' => $endpoint,
            ':window' => $this->timeWindow
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $count = intval($result['count']);
        
        return max(0, $this->maxRequests - $count);
    }
}


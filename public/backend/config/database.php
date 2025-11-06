<?php
/**
 * Lebanon Locals - Database Configuration
 * 
 * @version 1.0.0
 */

// Display errors for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $charset = "utf8mb4";
    
    public function __construct() {
        // Load .env file
        $envPath = __DIR__ . '/../../../.env';
        
        // If .env doesn't exist, try env.local.php as fallback
        if (file_exists($envPath)) {
            require_once __DIR__ . '/env-loader.php';
            loadEnv($envPath);
            
            $this->host = env('DB_HOST', '127.0.0.1');
            $this->db_name = env('DB_DATABASE', 'lebanon_locals');
            $this->username = env('DB_USERNAME', 'root');
            $this->password = env('DB_PASSWORD', '');
        } else {
            // Fallback to env.local.php
            $config = include __DIR__ . '/env.local.php';
            $this->host = $config['DB_HOST'];
            $this->db_name = $config['DB_DATABASE'];
            $this->username = $config['DB_USERNAME'];
            $this->password = $config['DB_PASSWORD'];
        }
    }
    
    public $conn;
    
    /**
     * Get database connection
     * 
     * @return PDO|null Database connection or null on failure
     */
    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
            
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            return null;
        }
        
        return $this->conn;
    }
}


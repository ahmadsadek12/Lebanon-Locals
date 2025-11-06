<?php
/**
 * Simple .env file loader
 * Reads .env file and loads variables into $_ENV
 */

function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception(".env file not found at: $path");
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes if present
            $value = trim($value, '"\'');
            
            // Set as environment variable
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// Helper function to get env variables
function env($key, $default = null) {
    return $_ENV[$key] ?? getenv($key) ?: $default;
}

// Auto-load .env file from project root
$envPath = __DIR__ . '/../../../.env';
if (file_exists($envPath)) {
    loadEnv($envPath);
}

<?php
/**
 * Script to update all API files to use cors.php instead of hardcoded CORS headers
 * 
 * Usage: php update-cors-headers.php
 */

$apiDir = __DIR__ . '/../api';
$files = [];

// Recursively find all PHP files
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($apiDir)
);

foreach ($iterator as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        $files[] = $file->getPathname();
    }
}

$updated = 0;
$skipped = 0;

foreach ($files as $filePath) {
    $content = file_get_contents($filePath);
    $originalContent = $content;
    
    // Skip if already using cors.php
    if (strpos($content, "require_once __DIR__ . '/../config/cors.php'") !== false ||
        strpos($content, "require_once __DIR__ . '/../../config/cors.php'") !== false ||
        strpos($content, "include_once __DIR__ . '/../config/cors.php'") !== false ||
        strpos($content, "include_once __DIR__ . '/../../config/cors.php'") !== false) {
        $skipped++;
        continue;
    }
    
    // Check if file has hardcoded CORS headers
    if (strpos($content, "Access-Control-Allow-Origin: *") === false) {
        $skipped++;
        continue;
    }
    
    // Determine relative path to cors.php
    $relativePath = '';
    if (strpos($filePath, '/admin/') !== false) {
        $relativePath = "__DIR__ . '/../../config/cors.php'";
    } else {
        $relativePath = "__DIR__ . '/../config/cors.php'";
    }
    
    // Remove all CORS-related headers
    $patterns = [
        "/header\s*\(\s*['\"]Access-Control-Allow-Origin:\s*\*['\"]\s*\)\s*;/i",
        "/header\s*\(\s*['\"]Access-Control-Allow-Methods:.*?['\"]\s*\)\s*;/i",
        "/header\s*\(\s*['\"]Access-Control-Allow-Headers:.*?['\"]\s*\)\s*;/i",
        "/header\s*\(\s*['\"]Access-Control-Max-Age:.*?['\"]\s*\)\s*;/i",
        "/header\s*\(\s*['\"]Access-Control-Allow-Credentials:.*?['\"]\s*\)\s*;/i",
    ];
    
    foreach ($patterns as $pattern) {
        $content = preg_replace($pattern, '', $content);
    }
    
    // Remove OPTIONS handling if it's just for CORS
    $content = preg_replace(
        "/if\s*\(\s*\\\$_SERVER\s*\[\s*['\"]REQUEST_METHOD['\"]\s*\]\s*===\s*['\"]OPTIONS['\"]\s*\)\s*\{[^}]*http_response_code\s*\(\s*200\s*\)\s*;\s*exit\s*\(\s*\)\s*;\s*\}/i",
        '',
        $content
    );
    
    // Find the first PHP tag or require/include statement
    $insertPosition = 0;
    
    // Look for existing require/include statements
    if (preg_match('/^<\?php\s*\n/', $content, $matches, PREG_OFFSET_CAPTURE)) {
        $insertPosition = strlen($matches[0][0]);
    }
    
    // Find where to insert (after first require/include or after opening PHP tag)
    $lines = explode("\n", $content);
    $insertLine = 0;
    for ($i = 0; $i < count($lines); $i++) {
        if (preg_match('/^(require|include)/i', $lines[$i])) {
            $insertLine = $i + 1;
        }
    }
    
    // Insert cors.php require and setCorsHeaders() call
    $corsInclude = "require_once $relativePath;\nsetCorsHeaders();\n";
    
    // Insert after opening PHP tag or after existing requires
    if ($insertLine > 0) {
        array_splice($lines, $insertLine, 0, $corsInclude);
    } else {
        // Insert after opening PHP tag
        if (isset($lines[0]) && strpos($lines[0], '<?php') !== false) {
            array_splice($lines, 1, 0, $corsInclude);
        } else {
            array_unshift($lines, "<?php\n" . $corsInclude);
        }
    }
    
    $content = implode("\n", $lines);
    
    // Clean up multiple blank lines
    $content = preg_replace("/\n{3,}/", "\n\n", $content);
    
    // Only write if content changed
    if ($content !== $originalContent) {
        file_put_contents($filePath, $content);
        $updated++;
        echo "Updated: " . basename($filePath) . "\n";
    } else {
        $skipped++;
    }
}

echo "\n";
echo "Summary:\n";
echo "- Updated: $updated files\n";
echo "- Skipped: $skipped files\n";



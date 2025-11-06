<?php
/**
 * Simple router for PHP dev server
 * This prevents index.html from being served for API requests
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// If it's a PHP file, let PHP process it
if (preg_match('/\.php$/', $uri)) {
    return false;
}

// If it's in backend folder, let PHP handle it
if (strpos($uri, '/backend/') === 0) {
    return false;
}

// If it's a static file that exists, serve it
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// For root or non-existent paths, serve index.html
if ($uri === '/') {
    include __DIR__ . '/index.html';
    return true;
}

// For everything else, let the default handler work
return false;


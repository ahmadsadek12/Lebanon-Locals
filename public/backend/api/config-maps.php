<?php
/**
 * Lebanon Locals - Google Maps Configuration
 * Returns the Google Maps API key
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// For now, hardcode the key (replace with your actual key)
// TODO: Move to api_credentials table when it's created
$apiKey = "AIzaSyCuscF9xhWY30c6f-s2bLR2-jTKufNj_Vc"; // Your Google Maps API key

echo json_encode([
    'success' => true,
    'api_key' => $apiKey
]);


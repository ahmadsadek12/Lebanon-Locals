<?php
/**
 * Check Payment Methods Availability
 * Returns which payment methods are enabled
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

// Load environment variables
require_once __DIR__ . '/../config/env-loader.php';

// Check if Whish is enabled
$whishEnabled = env('WHISH_ENABLED', 'true');
$whishEnabled = ($whishEnabled === 'true' || $whishEnabled === '1' || $whishEnabled === true);

// Stripe is always enabled (using test keys for local)
$stripeEnabled = true;

// Cash is always available
$cashEnabled = true;

echo json_encode([
    'success' => true,
    'payment_methods' => [
        'whish' => $whishEnabled,
        'card' => $stripeEnabled,
        'cash' => $cashEnabled
    ]
]);

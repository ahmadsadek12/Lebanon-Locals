<?php
/**
 * Test environment variable loading
 */

require_once __DIR__ . '/../config/env-loader.php';

echo "=== TESTING ENVIRONMENT VARIABLES ===\n\n";

echo "Database Config:\n";
echo "  DB_HOST: " . env('DB_HOST', 'NOT SET') . "\n";
echo "  DB_DATABASE: " . env('DB_DATABASE', 'NOT SET') . "\n";
echo "  DB_USERNAME: " . env('DB_USERNAME', 'NOT SET') . "\n\n";

echo "Stripe Config:\n";
echo "  STRIPE_PUBLISHABLE_KEY: " . (env('STRIPE_PUBLISHABLE_KEY') ? 'SET (pk_test_...)' : 'NOT SET') . "\n";
echo "  STRIPE_SECRET_KEY: " . (env('STRIPE_SECRET_KEY') ? 'SET (sk_test_...)' : 'NOT SET') . "\n";
echo "  STRIPE_CLIENT_ID: " . (env('STRIPE_CLIENT_ID') ? 'SET' : 'NOT SET') . "\n\n";

echo "Whish Config:\n";
echo "  WHISH_ENVIRONMENT: " . env('WHISH_ENVIRONMENT', 'NOT SET') . "\n";
echo "  WHISH_CHANNEL: " . env('WHISH_CHANNEL', 'NOT SET') . "\n";
echo "  WHISH_SECRET: " . (env('WHISH_SECRET') ? 'SET (hidden)' : 'NOT SET') . "\n";
echo "  WHISH_MERCHANT_PHONE: " . env('WHISH_MERCHANT_PHONE', 'NOT SET') . "\n\n";

if (env('WHISH_CHANNEL') && env('WHISH_SECRET')) {
    echo "✅ Whish is configured correctly!\n";
} else {
    echo "❌ Whish is NOT configured\n";
}

if (env('STRIPE_SECRET_KEY')) {
    echo "✅ Stripe is configured correctly!\n";
} else {
    echo "❌ Stripe is NOT configured\n";
}

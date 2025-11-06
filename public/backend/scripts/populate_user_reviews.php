<?php
/**
 * Populate User Reviews Script
 * Adds reviews for users (hosts) to test the user profile page
 */

require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "=================================\n";
echo "Populating User Reviews\n";
echo "=================================\n\n";

try {
    // Get all hosts (users who have listings)
    $hostsStmt = $pdo->query("
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.user_type
        FROM users u
        LEFT JOIN hostings h ON u.id = h.host_id
        LEFT JOIN stays s ON u.id = s.host_id
        WHERE (h.id IS NOT NULL OR s.id IS NOT NULL)
        AND u.user_type = 'host'
        LIMIT 10
    ");
    $hosts = $hostsStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($hosts)) {
        echo "No hosts found in database!\n";
        exit;
    }

    echo "Found " . count($hosts) . " hosts to add reviews for\n\n";

    // Get all customer users for reviewer assignment
    $customersStmt = $pdo->query("SELECT id FROM users WHERE user_type = 'customer'");
    $customers = $customersStmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($customers)) {
        echo "No customers found! Adding some customers first...\n";
        // Add a few customer users
        for ($i = 1; $i <= 5; $i++) {
            $pdo->exec("
                INSERT INTO users (first_name, last_name, email, user_type, created_at)
                VALUES ('Customer$i', 'User', 'customer$i@example.com', 'customer', NOW())
            ");
        }
        $customersStmt = $pdo->query("SELECT id FROM users WHERE user_type = 'customer'");
        $customers = $customersStmt->fetchAll(PDO::FETCH_COLUMN);
        echo "Added " . count($customers) . " customer users\n\n";
    }

    // Review templates
    $reviewTexts = [
        "Amazing host! Very responsive and helpful throughout our stay. Highly recommend!",
        "Great communication and made sure everything was perfect. Will definitely book again.",
        "Wonderful experience! The host went above and beyond to make our trip memorable.",
        "Very professional and accommodating. Everything was exactly as described.",
        "Fantastic host! Quick to respond and very friendly. Made us feel welcome.",
        "Excellent communication and very helpful with local recommendations.",
        "Super responsive and very organized. Made the whole experience smooth.",
        "Outstanding hospitality! The host was very attentive to all our needs.",
        "Very knowledgeable about the area and provided great tips for our visit.",
        "Couldn't have asked for a better host. Very friendly and professional.",
        "Great experience overall. The host was very accommodating and helpful.",
        "Highly recommend this host! Very responsive and made everything easy.",
        "The host was amazing! Very welcoming and made us feel right at home.",
        "Perfect host! Great communication and very helpful with everything.",
        "Wonderful experience! The host was very kind and accommodating."
    ];

    // Prepare insert statement
    $insertStmt = $pdo->prepare("
        INSERT INTO reviews (
            reviewer_id,
            reviewee_id,
            reviewee_type,
            stars,
            review_text,
            cleanliness_rating,
            communication_rating,
            accuracy_rating,
            location_rating,
            value_rating,
            is_visible,
            is_verified_booking,
            created_at
        ) VALUES (
            :reviewer_id,
            :reviewee_id,
            'user',
            :stars,
            :review_text,
            :cleanliness_rating,
            :communication_rating,
            :accuracy_rating,
            :location_rating,
            :value_rating,
            1,
            :is_verified,
            :created_at
        )
    ");

    $totalAdded = 0;

    // Add reviews for each host
    foreach ($hosts as $host) {
        // Random number of reviews per host (3-8)
        $reviewCount = rand(3, 8);

        echo "Adding {$reviewCount} reviews for {$host['first_name']} {$host['last_name']} (ID: {$host['id']})...\n";

        for ($i = 0; $i < $reviewCount; $i++) {
            // Random reviewer
            $reviewerId = $customers[array_rand($customers)];

            // Random stars (mostly 4-5, some 3)
            $stars = (rand(1, 10) <= 8) ? rand(4, 5) : 3;

            // Add some variation to stars
            if (rand(1, 10) <= 3) {
                $stars = rand(3, 5);
            }

            // Get random review text
            $reviewText = $reviewTexts[array_rand($reviewTexts)];

            // Individual ratings (usually close to overall star rating)
            $cleanlinessRating = max(1, min(5, $stars + (rand(-1, 1) * 0.5)));
            $communicationRating = max(1, min(5, $stars + (rand(-1, 1) * 0.5)));
            $accuracyRating = max(1, min(5, $stars + (rand(-1, 1) * 0.5)));
            $locationRating = max(1, min(5, $stars + (rand(-1, 1) * 0.5)));
            $valueRating = max(1, min(5, $stars + (rand(-1, 1) * 0.5)));

            // Random date in the last 6 months
            $daysAgo = rand(1, 180);
            $createdAt = date('Y-m-d H:i:s', strtotime("-{$daysAgo} days"));

            // 80% of reviews are verified bookings
            $isVerified = (rand(1, 10) <= 8) ? 1 : 0;

            $insertStmt->execute([
                'reviewer_id' => $reviewerId,
                'reviewee_id' => $host['id'],
                'stars' => $stars,
                'review_text' => $reviewText,
                'cleanliness_rating' => $cleanlinessRating,
                'communication_rating' => $communicationRating,
                'accuracy_rating' => $accuracyRating,
                'location_rating' => $locationRating,
                'value_rating' => $valueRating,
                'is_verified' => $isVerified,
                'created_at' => $createdAt
            ]);

            $totalAdded++;
        }
    }

    echo "\n=================================\n";
    echo "✓ Successfully added {$totalAdded} user reviews!\n";
    echo "=================================\n\n";

    // Show summary
    $summaryStmt = $pdo->query("
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            COUNT(r.id) as review_count,
            ROUND(AVG(r.stars), 2) as avg_rating
        FROM users u
        LEFT JOIN reviews r ON u.id = r.reviewee_id AND r.reviewee_type = 'user'
        WHERE u.user_type = 'host'
        GROUP BY u.id
        HAVING review_count > 0
        ORDER BY review_count DESC
    ");

    $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Summary of User Reviews:\n";
    echo str_repeat("-", 60) . "\n";
    printf("%-5s %-25s %-15s %-10s\n", "ID", "Host Name", "Reviews", "Avg Rating");
    echo str_repeat("-", 60) . "\n";

    foreach ($summary as $row) {
        printf(
            "%-5s %-25s %-15s %-10s\n",
            $row['id'],
            $row['first_name'] . ' ' . $row['last_name'],
            $row['review_count'],
            $row['avg_rating']
        );
    }

    echo str_repeat("-", 60) . "\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

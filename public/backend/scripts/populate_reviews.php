<?php
require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    die("Database connection failed\n");
}

echo "=================================\n";
echo "Populating Reviews with Host Responses\n";
echo "=================================\n\n";

// Sample review texts
$reviewTexts = [
    "Amazing experience! Everything was perfect from start to finish. Highly recommend!",
    "Really enjoyed this. Great value for money and the host was very welcoming.",
    "Good overall, but there were a few minor issues. Still had a great time though.",
    "Absolutely loved it! Will definitely be back and recommending to friends.",
    "Exceeded my expectations in every way. Fantastic!",
    "Nice place, clean and comfortable. Location was perfect.",
    "The host went above and beyond to make sure we had everything we needed.",
    "Beautiful setting and great amenities. Everything was as described.",
    "Wonderful experience. Very authentic and memorable.",
    "Perfect for families. Kids loved it and so did we!",
    "Great communication from the host. Everything was seamless.",
    "Clean, comfortable, and exactly as advertised. Would visit again.",
    "The photos don't do it justice - it's even better in person!",
    "Had an incredible time. The host's attention to detail was impressive.",
    "Good experience but not quite what I expected based on the description.",
    "Absolutely phenomenal! Can't wait to come back.",
    "Very relaxing and peaceful. Just what we needed.",
    "The host was super responsive and helpful throughout our stay.",
    "Great location and beautiful views. Highly recommended!",
    "Lovely place with lots of character. Really enjoyed our time here."
];

// Sample host responses
$hostResponses = [
    "Thank you so much for your kind words! We're thrilled you enjoyed your experience. Hope to see you again soon!",
    "We really appreciate your feedback and are so glad you had a great time with us. Thanks for visiting!",
    "Thank you for taking the time to write this review! Your feedback means a lot to us.",
    "So happy to hear you enjoyed your visit! We look forward to hosting you again in the future.",
    "Thanks for the wonderful review! We're delighted that everything met your expectations.",
    "We appreciate your honest feedback and are glad you had a good overall experience. We're constantly working to improve!",
    "Thank you for staying with us! Your kind words made our day. Come back anytime!",
    "We're so pleased you enjoyed your time here. Thanks for being such wonderful guests!",
    "Thank you for the amazing review! We put a lot of care into every detail and it's great to know it showed.",
    "We're thrilled you had such a positive experience! Hope to welcome you back soon.",
    "Thanks for choosing us! Your satisfaction is our priority and we're glad we could deliver.",
    "What a lovely review! Thank you so much for your kind words and for being great guests.",
    "We appreciate you taking the time to share your experience. So glad you enjoyed it!",
    "Thank you for the feedback! We're always striving to provide the best experience possible.",
    "Your review just made our day! Thank you for staying with us and we hope to see you again.",
    "We're so happy you had a great time! Thanks for the wonderful review and recommendation.",
    "Thank you for being amazing guests! We loved hosting you and hope you'll return soon.",
    "We really appreciate your kind words! It was our pleasure to host you.",
    "Thanks so much for this review! We're delighted everything worked out perfectly for you.",
    "Your feedback is very encouraging! Thank you and we look forward to your next visit."
];

try {
    // Get all hostings and stays that have existing reviews
    $stmt = $pdo->query("
        SELECT DISTINCT reviewee_type, reviewee_id
        FROM reviews
        WHERE reviewee_type IN ('hosting', 'stay')
        LIMIT 20
    ");

    $reviewees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($reviewees) . " items with reviews\n\n";

    $updatedCount = 0;
    $addedCount = 0;

    foreach ($reviewees as $reviewee) {
        // Update existing reviews without host responses
        $updateStmt = $pdo->prepare("
            SELECT id, stars
            FROM reviews
            WHERE reviewee_type = :type
            AND reviewee_id = :id
            AND (host_response IS NULL OR host_response = '')
            AND is_visible = 1
            LIMIT 3
        ");

        $updateStmt->execute([
            'type' => $reviewee['reviewee_type'],
            'id' => $reviewee['reviewee_id']
        ]);

        $reviewsToUpdate = $updateStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($reviewsToUpdate as $review) {
            // 70% chance of host response
            if (rand(1, 100) <= 70) {
                $response = $hostResponses[array_rand($hostResponses)];

                // Random response date (within 7 days after review)
                $responseDate = date('Y-m-d H:i:s', strtotime('+' . rand(1, 7) . ' days'));

                // Update individual rating categories if they're missing
                $ratings = [
                    'cleanliness_rating' => round($review['stars'] + (rand(-5, 5) / 10), 1),
                    'communication_rating' => round($review['stars'] + (rand(-5, 5) / 10), 1),
                    'accuracy_rating' => round($review['stars'] + (rand(-5, 5) / 10), 1),
                    'location_rating' => round($review['stars'] + (rand(-5, 5) / 10), 1),
                    'value_rating' => round($review['stars'] + (rand(-5, 5) / 10), 1)
                ];

                // Ensure ratings stay within 1-5 range
                foreach ($ratings as $key => $value) {
                    $ratings[$key] = max(1.0, min(5.0, $value));
                }

                $updateReviewStmt = $pdo->prepare("
                    UPDATE reviews
                    SET host_response = :response,
                        host_response_date = :response_date,
                        cleanliness_rating = :cleanliness,
                        communication_rating = :communication,
                        accuracy_rating = :accuracy,
                        location_rating = :location,
                        value_rating = :value
                    WHERE id = :review_id
                ");

                $updateReviewStmt->execute([
                    'response' => $response,
                    'response_date' => $responseDate,
                    'cleanliness' => $ratings['cleanliness_rating'],
                    'communication' => $ratings['communication_rating'],
                    'accuracy' => $ratings['accuracy_rating'],
                    'location' => $ratings['location_rating'],
                    'value' => $ratings['value_rating'],
                    'review_id' => $review['id']
                ]);

                $updatedCount++;
            }
        }

        // Add a few more reviews if there are less than 5
        $countStmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM reviews
            WHERE reviewee_type = :type
            AND reviewee_id = :id
        ");

        $countStmt->execute([
            'type' => $reviewee['reviewee_type'],
            'id' => $reviewee['reviewee_id']
        ]);

        $currentCount = $countStmt->fetch()['count'];

        if ($currentCount < 5) {
            $toAdd = min(3, 5 - $currentCount);

            // Get random users
            $userStmt = $pdo->query("SELECT id FROM users WHERE user_type = 'customer' LIMIT 20");
            $users = $userStmt->fetchAll(PDO::FETCH_COLUMN);

            if (count($users) > 0) {
                for ($i = 0; $i < $toAdd; $i++) {
                    $stars = round(rand(35, 50) / 10, 1);
                    $reviewText = $reviewTexts[array_rand($reviewTexts)];
                    $userId = $users[array_rand($users)];

                    // Random date in the past 6 months
                    $createdDate = date('Y-m-d H:i:s', strtotime('-' . rand(1, 180) . ' days'));

                    $ratings = [
                        'cleanliness' => round($stars + (rand(-5, 5) / 10), 1),
                        'communication' => round($stars + (rand(-5, 5) / 10), 1),
                        'accuracy' => round($stars + (rand(-5, 5) / 10), 1),
                        'location' => round($stars + (rand(-5, 5) / 10), 1),
                        'value' => round($stars + (rand(-5, 5) / 10), 1)
                    ];

                    // Ensure ratings stay within 1-5 range
                    foreach ($ratings as $key => $value) {
                        $ratings[$key] = max(1.0, min(5.0, $value));
                    }

                    // 60% chance of host response for new reviews
                    $hostResponse = null;
                    $hostResponseDate = null;
                    if (rand(1, 100) <= 60) {
                        $hostResponse = $hostResponses[array_rand($hostResponses)];
                        $hostResponseDate = date('Y-m-d H:i:s', strtotime($createdDate . ' +' . rand(1, 5) . ' days'));
                    }

                    $insertStmt = $pdo->prepare("
                        INSERT INTO reviews (
                            reviewer_id, reviewee_type, reviewee_id, stars, review_text,
                            cleanliness_rating, communication_rating, accuracy_rating, location_rating, value_rating,
                            is_verified_booking, host_response, host_response_date, is_visible, created_at
                        ) VALUES (
                            :reviewer_id, :reviewee_type, :reviewee_id, :stars, :review_text,
                            :cleanliness, :communication, :accuracy, :location, :value,
                            1, :host_response, :host_response_date, 1, :created_at
                        )
                    ");

                    $insertStmt->execute([
                        'reviewer_id' => $userId,
                        'reviewee_type' => $reviewee['reviewee_type'],
                        'reviewee_id' => $reviewee['reviewee_id'],
                        'stars' => $stars,
                        'review_text' => $reviewText,
                        'cleanliness' => $ratings['cleanliness'],
                        'communication' => $ratings['communication'],
                        'accuracy' => $ratings['accuracy'],
                        'location' => $ratings['location'],
                        'value' => $ratings['value'],
                        'host_response' => $hostResponse,
                        'host_response_date' => $hostResponseDate,
                        'created_at' => $createdDate
                    ]);

                    $addedCount++;
                }
            }
        }
    }

    echo "=================================\n";
    echo "Summary:\n";
    echo "  Reviews updated with host responses: {$updatedCount}\n";
    echo "  New reviews added: {$addedCount}\n";
    echo "=================================\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

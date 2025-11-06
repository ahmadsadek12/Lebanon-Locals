/**
 * Lebanon Locals - Reviews Page Logic
 * @version 1.0.0
 */

(function() {
    'use strict';

    // State
    let reviewsData = null;
    let allReviews = [];
    let filteredReviews = [];
    let currentFilter = 'all';
    let revieweeType = null;
    let revieweeId = null;

    // DOM Elements
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const reviewsContent = document.getElementById('reviews-content');
    const errorMessage = document.getElementById('error-message');

    /**
     * Initialize the page
     */
    function init() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        revieweeType = urlParams.get('type'); // hosting, stay, user
        revieweeId = urlParams.get('id');

        // Validate parameters
        if (!revieweeType || !revieweeId) {
            showError('Missing required parameters. Please return to the listing page.');
            return;
        }

        // Load reviews
        loadReviews();

        // Setup event listeners
        setupEventListeners();
    }

    /**
     * Load reviews from API
     */
    async function loadReviews() {
        try {
            // Use relative path to backend API
            const apiUrl = `/backend/api/reviews.php?reviewee_type=${revieweeType}&reviewee_id=${revieweeId}`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error('Failed to load reviews');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to load reviews');
            }

            reviewsData = data.data;
            allReviews = reviewsData.reviews;
            filteredReviews = [...allReviews];

            // Render the page
            renderPage();

            // Hide loading, show content
            loadingState.style.display = 'none';
            reviewsContent.style.display = 'block';

        } catch (error) {
            console.error('Error loading reviews:', error);
            showError('Unable to load reviews. Please try again later.');
        }
    }

    /**
     * Render the entire page
     */
    function renderPage() {
        renderHeader();
        renderRatingBreakdown();
        renderReviews();
    }

    /**
     * Render header section with summary
     */
    function renderHeader() {
        const { stats } = reviewsData;

        // Update average rating
        document.getElementById('average-rating').textContent = stats.average_rating.toFixed(1);

        // Update total reviews
        const reviewText = stats.total_reviews === 1 ? 'review' : 'reviews';
        document.getElementById('total-reviews').textContent = `${stats.total_reviews} ${reviewText}`;

        // Update rating stars
        const starsContainer = document.getElementById('rating-stars');
        starsContainer.innerHTML = renderStars(stats.average_rating);
    }

    /**
     * Render rating breakdown section
     */
    function renderRatingBreakdown() {
        const { stats } = reviewsData;
        const { rating_breakdown, star_distribution } = stats;

        let breakdownHTML = '<div class="breakdown-grid">';

        // Category ratings with icons
        const categories = [
            { key: 'cleanliness', label: 'Cleanliness', icon: 'fa-home' },
            { key: 'communication', label: 'Communication', icon: 'fa-comments' },
            { key: 'accuracy', label: 'Accuracy', icon: 'fa-check-circle' },
            { key: 'location', label: 'Location', icon: 'fa-map-marker' },
            { key: 'value', label: 'Value', icon: 'fa-dollar' }
        ];

        categories.forEach(cat => {
            const rating = rating_breakdown[cat.key];
            if (rating > 0) {
                breakdownHTML += `
                    <div class="breakdown-item">
                        <i class="fa ${cat.icon}"></i>
                        <div class="breakdown-content">
                            <div class="breakdown-label">${cat.label}</div>
                            <div class="breakdown-value">${rating.toFixed(1)}</div>
                        </div>
                    </div>
                `;
            }
        });

        breakdownHTML += '</div>';

        // Star distribution
        if (stats.total_reviews > 0) {
            breakdownHTML += '<div class="star-distribution"><h3>Rating distribution</h3>';

            const stars = [5, 4, 3, 2, 1];
            stars.forEach(starNum => {
                const count = star_distribution[starNum] || 0;
                const percentage = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;

                breakdownHTML += `
                    <div class="star-row">
                        <div class="star-label">${starNum} stars</div>
                        <div class="star-bar">
                            <div class="star-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="star-count">${count}</div>
                    </div>
                `;
            });

            breakdownHTML += '</div>';
        }

        document.getElementById('rating-breakdown').innerHTML = breakdownHTML;
    }

    /**
     * Render reviews list
     */
    function renderReviews() {
        const reviewsList = document.getElementById('reviews-list');

        if (filteredReviews.length === 0) {
            reviewsList.innerHTML = '<p style="text-align: center; color: #717171; padding: 40px 0;">No reviews to display.</p>';
            return;
        }

        let reviewsHTML = '';

        filteredReviews.forEach(review => {
            reviewsHTML += renderReview(review);
        });

        reviewsList.innerHTML = reviewsHTML;
    }

    /**
     * Render a single review
     */
    function renderReview(review) {
        const reviewDate = formatDate(review.created_at);
        const memberSince = review.reviewer.member_since ? new Date(review.reviewer.member_since).getFullYear() : '';

        // Avatar
        let avatarHTML = '';
        if (review.reviewer.picture) {
            avatarHTML = `<img src="${review.reviewer.picture}" alt="${review.reviewer.first_name}" class="reviewer-avatar">`;
        } else {
            const initial = review.reviewer.first_name.charAt(0).toUpperCase();
            avatarHTML = `<div class="reviewer-avatar-placeholder">${initial}</div>`;
        }

        // Verified badge
        let verifiedBadge = '';
        if (review.is_verified_booking) {
            verifiedBadge = '<span class="verified-badge"><i class="fa fa-check-circle"></i> Verified</span>';
        }

        // Detailed ratings with icons
        let ratingsDetailHTML = '';
        if (review.ratings.cleanliness || review.ratings.communication || review.ratings.accuracy || review.ratings.location || review.ratings.value) {
            ratingsDetailHTML = '<div class="review-ratings-detail">';

            const ratingLabels = {
                cleanliness: { label: 'Cleanliness', icon: 'fa-home' },
                communication: { label: 'Communication', icon: 'fa-comments' },
                accuracy: { label: 'Accuracy', icon: 'fa-check-circle' },
                location: { label: 'Location', icon: 'fa-map-marker' },
                value: { label: 'Value', icon: 'fa-dollar' }
            };

            Object.entries(review.ratings).forEach(([key, value]) => {
                if (value && ratingLabels[key]) {
                    ratingsDetailHTML += `
                        <div class="rating-detail-item">
                            <i class="fa ${ratingLabels[key].icon}"></i>
                            <div class="rating-detail-content">
                                <div class="rating-detail-label">${ratingLabels[key].label}</div>
                                <div class="rating-detail-value">${value.toFixed(1)}</div>
                            </div>
                        </div>
                    `;
                }
            });

            ratingsDetailHTML += '</div>';
        }

        // Host response
        let hostResponseHTML = '';
        if (review.host_response) {
            const responseDate = review.host_response_date ? formatDate(review.host_response_date) : '';
            hostResponseHTML = `
                <div class="host-response">
                    <div class="host-response-header">
                        <div class="host-response-title">Response from host</div>
                        ${responseDate ? `<div class="host-response-date">${responseDate}</div>` : ''}
                    </div>
                    <div class="host-response-text">${escapeHtml(review.host_response)}</div>
                </div>
            `;
        }

        return `
            <div class="review-item" data-review-id="${review.id}">
                <div class="review-header">
                    ${avatarHTML}
                    <div class="reviewer-info">
                        <div class="reviewer-name">${escapeHtml(review.reviewer.first_name)} ${escapeHtml(review.reviewer.last_name.charAt(0))}.</div>
                        <div class="reviewer-meta">
                            ${memberSince ? `<span>Member since ${memberSince}</span>` : ''}
                            ${verifiedBadge}
                        </div>
                    </div>
                </div>
                <div class="review-rating">${renderStars(review.stars)}</div>
                <div class="review-date">${reviewDate}</div>
                ${review.review_text ? `<div class="review-text">${escapeHtml(review.review_text)}</div>` : ''}
                ${ratingsDetailHTML}
                ${hostResponseHTML}
            </div>
        `;
    }

    /**
     * Render star rating with decimal support
     */
    function renderStars(rating) {
        const percentage = (rating / 5) * 100;
        return `
            <div class="stars-container">
                <div class="stars-background">★★★★★</div>
                <div class="stars-fill" style="width: ${percentage}%">
                    <div class="stars-foreground">★★★★★</div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const filter = this.dataset.filter;
                applyFilter(filter);

                // Update active state
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    /**
     * Apply filter to reviews
     */
    function applyFilter(filter) {
        currentFilter = filter;

        switch (filter) {
            case 'all':
                filteredReviews = [...allReviews];
                break;

            case 'recent':
                filteredReviews = [...allReviews].sort((a, b) => {
                    return new Date(b.created_at) - new Date(a.created_at);
                });
                break;

            case 'highest':
                filteredReviews = [...allReviews].sort((a, b) => b.stars - a.stars);
                break;

            case 'lowest':
                filteredReviews = [...allReviews].sort((a, b) => a.stars - b.stars);
                break;

            case 'with-response':
                filteredReviews = allReviews.filter(review => review.host_response);
                break;

            default:
                filteredReviews = [...allReviews];
        }

        renderReviews();
    }

    /**
     * Format date
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Show error state
     */
    function showError(message) {
        errorMessage.textContent = message;
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

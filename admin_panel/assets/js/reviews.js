/**
 * Admin Reviews Management
 */

if (!window.AdminAuth.requireAdmin()) {}

const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

let allReviews = [];

async function loadReviews() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/reviews.php');
        if (data.success && data.data) {
            allReviews = data.data;
            displayReviews(allReviews);
        }
    } catch (error) {
        console.error('[ADMIN] Error loading reviews:', error);
    }
}

function displayReviews(reviews) {
    const container = document.getElementById('reviews-table');
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-comment"></i><p>No reviews found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Reviewer</th>
                    <th>Listing</th>
                    <th>Rating</th>
                    <th>Review</th>
                    <th>Date</th>
                    <th>Visible</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${reviews.map(review => `
                    <tr>
                        <td>#${review.id}</td>
                        <td>${review.reviewer_name || 'N/A'}</td>
                        <td>${review.listing_title || 'N/A'} (${review.reviewee_type})</td>
                        <td>${renderStars(review.stars)}</td>
                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${review.review_text || ''}</td>
                        <td>${formatDate(review.created_at)}</td>
                        <td class="clickable-cell" style="text-align: center;" onclick="toggleVisibility(${review.id}, ${review.is_visible})" title="Click to ${review.is_visible == 1 ? 'hide' : 'show'}">
                            ${review.is_visible == 1 ? '<span class="badge badge-success">Visible</span>' : '<span class="badge badge-secondary">Hidden</span>'}
                        </td>
                        <td style="text-align: center;">
                            <button class="btn btn-delete" onclick="deleteReview(${review.id})" title="Delete">
                                <i class="fa fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

document.getElementById('filter-visible').addEventListener('change', function(e) {
    const visible = e.target.value;
    const filtered = visible === '' ? allReviews : allReviews.filter(r => r.is_visible == visible);
    displayReviews(filtered);
});

document.getElementById('search-reviews').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const filtered = allReviews.filter(r =>
        (r.reviewer_name && r.reviewer_name.toLowerCase().includes(query)) ||
        (r.review_text && r.review_text.toLowerCase().includes(query)) ||
        (r.listing_title && r.listing_title.toLowerCase().includes(query))
    );
    displayReviews(filtered);
});

async function toggleVisibility(id, currentStatus) {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus == 1 ? 'shown' : 'hidden';

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/update-review.php', {
            method: 'POST',
            body: JSON.stringify({ id, is_visible: newStatus })
        });

        if (data.success) {
            window.toast.success(`Review ${action}`);
            loadReviews();
        }
    } catch (error) {
        console.error('[ADMIN] Error toggling visibility:', error);
        window.toast.error(error.message);
    }
}

async function deleteReview(id) {
    if (!confirm('Delete this review? This action cannot be undone.')) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/delete-review.php', {
            method: 'POST',
            body: JSON.stringify({ id })
        });

        if (data.success) {
            window.toast.success('Review deleted successfully');
            loadReviews();
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting review:', error);
        window.toast.error(error.message);
    }
}

function renderStars(rating) {
    const stars = [];
    for (let i = 0; i < 5; i++) {
        stars.push(i < rating ? '★' : '☆');
    }
    return `<span style="color: #FFD700;">${stars.join('')}</span> (${parseFloat(rating).toFixed(1)})`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

loadReviews();


/**
 * Admin Listings Management (Experiences, Events, Stays)
 */

if (!window.AdminAuth.requireAdmin()) {}

const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

const listingType = window.LISTING_TYPE || 'experience'; // Set in HTML
const listingTitle = window.LISTING_TITLE || 'Listings';
let allListings = [];

async function loadListings() {
    const container = document.getElementById('listings-table');

    try {
        // Show loading state
        container.innerHTML = `
            <div class="loading">
                <i class="fa fa-spinner fa-spin" style="font-size: 48px; color: var(--primary);"></i>
                <p style="margin-top: 20px;">Loading ${listingTitle.toLowerCase()}...</p>
            </div>
        `;

        const endpoint = listingType === 'stay'
            ? '../public/backend/api/admin/stays.php'
            : `../public/backend/api/admin/hostings.php?type=${listingType}`;

        const data = await window.AdminAuth.apiRequest(endpoint);

        if (data.success && data.data) {
            allListings = data.data;
            displayListings(allListings);
        } else {
            throw new Error(data.error || 'Failed to load listings');
        }
    } catch (error) {
        console.error(`[ADMIN] Error loading ${listingType}s:`, error);

        // Show error state
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa fa-exclamation-triangle" style="font-size: 64px; color: var(--danger);"></i>
                <h3 style="margin-top: 20px;">Unable to Load ${listingTitle}</h3>
                <p style="margin-top: 12px; max-width: 500px; margin: 12px auto;">
                    ${error.message || 'Connection error. Please check if the server is running.'}
                </p>
                <button onclick="loadListings()" class="btn btn-primary" style="margin-top: 24px;">
                    <i class="fa fa-refresh"></i> Try Again
                </button>
            </div>
        `;
    }
}

function displayListings(listings) {
    const container = document.getElementById('listings-table');

    if (!listings || listings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa fa-${listingType === 'stay' ? 'home' : listingType === 'event' ? 'calendar-check-o' : 'star'}"></i>
                <h3>No ${listingTitle} Found</h3>
                <p>There are no ${listingType}s to display.</p>
            </div>
        `;
        return;
    }

    const priceLabel = listingType === 'stay' ? 'per night' : 'per person';

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Host</th>
                    <th>Location</th>
                    <th>Price</th>
                    <th>Fee %</th>
                    <th>Rating</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: center;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${listings.map(listing => `
                    <tr>
                        <td>#${listing.id}</td>
                        <td><strong>${escapeHtml(listing.title)}</strong></td>
                        <td>${escapeHtml(listing.host_name || 'N/A')}</td>
                        <td>${escapeHtml(listing.location || 'N/A')}</td>
                        <td><strong>$${parseFloat(listing.price || listing.price_per_night || 0).toFixed(2)}</strong> ${priceLabel}</td>
                        <td class="clickable-cell" onclick="editServiceFee(${listing.id}, ${listing.service_fee_percentage || 0})" title="Click to edit service fee">
                            <span style="color: var(--primary); font-weight: 600;">${parseFloat(listing.service_fee_percentage || 0).toFixed(1)}%</span>
                        </td>
                        <td>${listing.average_rating && listing.average_rating > 0 ? `⭐ ${parseFloat(listing.average_rating).toFixed(1)}` : '<span style="color: #999;">No reviews</span>'}</td>
                        <td class="clickable-cell" style="text-align: center;" onclick="toggleActive(${listing.id}, ${listing.is_active})" title="Click to ${listing.is_active == 1 ? 'deactivate' : 'activate'}">
                            ${listing.is_active == 1
                                ? '<span class="badge badge-success">Active</span>'
                                : '<span class="badge badge-secondary">Inactive</span>'}
                        </td>
                        <td style="text-align: center;">
                            <button
                                class="btn btn-delete"
                                onclick="deleteListing(${listing.id}, '${escapeHtml(listing.title).replace(/'/g, "\\'")}')"
                                title="Delete">
                                <i class="fa fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="text-center" style="margin-top: 20px; color: var(--gray);">
            Showing <strong>${listings.length}</strong> ${listingTitle.toLowerCase()}
        </div>
    `;
}

// Filter by active status
document.getElementById('filter-active').addEventListener('change', function(e) {
    const active = e.target.value;
    const searchQuery = document.getElementById('search-listings').value.toLowerCase();

    let filtered = active === '' ? allListings : allListings.filter(l => l.is_active == active);

    // Apply search filter if there's a query
    if (searchQuery) {
        filtered = filtered.filter(l =>
            l.title.toLowerCase().includes(searchQuery) ||
            (l.location && l.location.toLowerCase().includes(searchQuery)) ||
            (l.host_name && l.host_name.toLowerCase().includes(searchQuery))
        );
    }

    displayListings(filtered);
});

// Search functionality
document.getElementById('search-listings').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const activeFilter = document.getElementById('filter-active').value;

    let filtered = activeFilter === '' ? allListings : allListings.filter(l => l.is_active == activeFilter);

    // Apply search filter
    if (query) {
        filtered = filtered.filter(l =>
            l.title.toLowerCase().includes(query) ||
            (l.location && l.location.toLowerCase().includes(query)) ||
            (l.host_name && l.host_name.toLowerCase().includes(query))
        );
    }

    displayListings(filtered);
});

async function toggleActive(id, currentStatus) {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus == 1 ? 'activated' : 'deactivated';

    try {
        const endpoint = listingType === 'stay'
            ? '../public/backend/api/admin/update-stay.php'
            : '../public/backend/api/admin/update-hosting.php';

        const data = await window.AdminAuth.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ id, is_active: newStatus })
        });

        if (data.success) {
            window.toast.success(`${listingTitle.slice(0, -1)} ${action}`);
            loadListings();
        } else {
            throw new Error(data.error || `Failed to update status`);
        }
    } catch (error) {
        console.error('[ADMIN] Error toggling active:', error);
        window.toast.error(error.message);
    }
}

async function deleteListing(id, title) {
    if (!confirm(`Delete "${title}"?\n\nThis action cannot be undone.`)) return;

    try {
        const endpoint = listingType === 'stay'
            ? '../public/backend/api/admin/delete-stay.php'
            : '../public/backend/api/admin/delete-hosting.php';

        const data = await window.AdminAuth.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ id })
        });

        if (data.success) {
            window.toast.success(`Deleted successfully`);
            loadListings();
        } else {
            throw new Error(data.error || 'Failed to delete');
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting:', error);
        window.toast.error(error.message);
    }
}

async function editServiceFee(id, currentFee) {
    const newFee = prompt(`Enter service fee percentage (0-100):`, parseFloat(currentFee).toFixed(1));

    if (newFee === null) return; // User cancelled

    const fee = parseFloat(newFee);
    if (isNaN(fee) || fee < 0 || fee > 100) {
        window.toast.error('Please enter a valid percentage between 0 and 100');
        return;
    }

    try {
        const endpoint = listingType === 'stay'
            ? '../public/backend/api/admin/update-stay.php'
            : '../public/backend/api/admin/update-hosting.php';

        const data = await window.AdminAuth.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ id, service_fee_percentage: fee })
        });

        if (data.success) {
            window.toast.success(`Service fee updated to ${fee}%`);
            loadListings();
        } else {
            throw new Error(data.error || 'Failed to update service fee');
        }
    } catch (error) {
        console.error('[ADMIN] Error updating service fee:', error);
        window.toast.error(error.message);
    }
}

function openAddModal() {
    document.getElementById('add-modal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('add-modal').classList.remove('active');
    document.getElementById('add-form').reset();
}

// Handle add form submission
const addForm = document.getElementById('add-form');
if (addForm) {
    addForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            location: document.getElementById('location').value,
            price: parseFloat(document.getElementById('price').value),
            service_fee_percentage: parseFloat(document.getElementById('service_fee').value),
            min_guests: parseInt(document.getElementById('min_guests').value) || 1,
            max_guests: parseInt(document.getElementById('max_guests').value) || 10,
            length_hours: parseFloat(document.getElementById('length_hours').value) || null,
            difficulty: document.getElementById('difficulty')?.value || 'easy',
            main_image: document.getElementById('main_image').value || null,
            is_active: 1
        };

        // Add hosting_type for experiences/events
        if (listingType !== 'stay') {
            formData.hosting_type = listingType;
        }

        try {
            const endpoint = listingType === 'stay'
                ? '../public/backend/api/create-posting.php' // Reuse existing API
                : '../public/backend/api/create-posting.php';

            const data = await window.AdminAuth.apiRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (data.success) {
                window.toast.success(`${listingTitle.slice(0, -1)} created successfully`);
                closeAddModal();
                loadListings();
            } else {
                throw new Error(data.error || `Failed to create ${listingType}`);
            }
        } catch (error) {
            console.error('[ADMIN] Error creating listing:', error);
            window.toast.error(error.message);
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadListings();


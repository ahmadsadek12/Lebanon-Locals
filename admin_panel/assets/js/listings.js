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
                                class="btn btn-view"
                                onclick="viewListingDetails(${listing.id})"
                                title="View Details">
                                <i class="fa fa-eye"></i> View
                            </button>
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

// Listing Details Modal Functions
let currentEditingListing = null;
let isEditModeListing = false;

async function viewListingDetails(listingId) {
    const modal = document.getElementById('listing-details-modal');
    const content = document.getElementById('listing-details-content');
    
    modal.classList.add('active');
    content.innerHTML = '<div class="loading"><i class="fa fa-spinner fa-spin" style="font-size: 32px;"></i><p>Loading listing details...</p></div>';

    try {
        const data = await window.AdminAuth.apiRequest(`../public/backend/api/admin/get-listing-details.php?id=${listingId}&type=${listingType}`);
        
        if (data.success && data.data) {
            currentEditingListing = data.data;
            renderListingDetails(currentEditingListing, false);
        } else {
            content.innerHTML = '<div class="empty-state"><p>Error loading listing details</p></div>';
        }
    } catch (error) {
        console.error('[ADMIN] Error loading listing details:', error);
        content.innerHTML = '<div class="empty-state"><p>Error loading listing details</p></div>';
    }
}

function renderListingDetails(listing, editMode = false) {
    const content = document.getElementById('listing-details-content');
    isEditModeListing = editMode;
    
    // Helper to get image URL (handles S3 URLs and local paths)
    const getImageUrl = (imagePath) => {
        if (!imagePath) return '../public/images/default_image.png';
        // If it's already a full URL (starts with http/https), use it directly
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        // Otherwise, it's a local path, prefix with ../public/
        return `../public/${imagePath}`;
    };
    
    // Format helpers
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return dateStr.split('T')[0];
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        return timeStr.substring(0, 5); // HH:MM
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Helper to create editable field
    const createField = (label, fieldName, value, type = 'text', options = null) => {
        const fieldId = `edit_${fieldName}`;
        const displayValue = value || '';
        
        if (editMode) {
            if (type === 'select' && options) {
                let selectHtml = `<select id="${fieldId}" class="edit-field" data-field="${fieldName}">`;
                selectHtml += `<option value="">-- Clear --</option>`;
                options.forEach(opt => {
                    const selected = opt.value === displayValue ? 'selected' : '';
                    selectHtml += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
                });
                selectHtml += '</select>';
                return selectHtml;
            } else if (type === 'textarea') {
                return `<textarea id="${fieldId}" class="edit-field" data-field="${fieldName}" rows="4">${displayValue}</textarea>`;
            } else if (type === 'date') {
                return `<input type="date" id="${fieldId}" class="edit-field" data-field="${fieldName}" value="${formatDate(displayValue)}">`;
            } else if (type === 'time') {
                return `<input type="time" id="${fieldId}" class="edit-field" data-field="${fieldName}" value="${formatTime(displayValue)}">`;
            } else if (type === 'number') {
                return `<input type="number" id="${fieldId}" class="edit-field" data-field="${fieldName}" value="${displayValue}" step="${fieldName.includes('price') || fieldName.includes('fee') ? '0.01' : '1'}">`;
            } else if (type === 'checkbox') {
                return `<input type="checkbox" id="${fieldId}" class="edit-field" data-field="${fieldName}" ${value ? 'checked' : ''}>`;
            } else {
                return `<input type="${type}" id="${fieldId}" class="edit-field" data-field="${fieldName}" value="${displayValue}" placeholder="Enter ${label.toLowerCase()}">`;
            }
        } else {
            return `<span class="detail-value">${displayValue || 'N/A'}</span>`;
        }
    };

    // Build content based on listing type
    let htmlContent = `
        <style>
            .listing-details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                margin-bottom: 32px;
            }
            .listing-details-section {
                background: #f7f7f7;
                padding: 20px;
                border-radius: 8px;
            }
            .listing-details-section h3 {
                font-size: 18px;
                margin-bottom: 16px;
                color: #222;
                border-bottom: 2px solid var(--primary);
                padding-bottom: 8px;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e0e0e0;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: 600;
                color: #717171;
            }
            .detail-value {
                color: #222;
                text-align: right;
            }
            .listing-image-container {
                text-align: center;
                margin-bottom: 24px;
            }
            .listing-image-container img {
                max-width: 300px;
                max-height: 300px;
                border-radius: 8px;
                border: 3px solid var(--border);
            }
            .additional-images-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 16px;
                margin-top: 16px;
            }
            .image-item {
                position: relative;
                border-radius: 8px;
                overflow: hidden;
                border: 2px solid #e0e0e0;
            }
            .image-item img {
                width: 100%;
                height: 150px;
                object-fit: cover;
                display: block;
            }
            .image-item .btn {
                border: none;
                color: white;
                cursor: pointer;
                border-radius: 4px;
            }
            .image-item .btn:hover {
                opacity: 0.9;
                transform: scale(1.05);
            }
            .new-image-upload-item {
                margin-bottom: 16px;
                padding: 16px;
                border: 2px dashed #ddd;
                border-radius: 8px;
                background: #f9f9f9;
            }
            .full-width {
                grid-column: 1 / -1;
            }
            .edit-field {
                width: 100%;
                padding: 8px 12px;
                border: 2px solid var(--border);
                border-radius: 6px;
                font-size: 14px;
                font-family: inherit;
                transition: all 0.3s;
            }
            .edit-field:focus {
                outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.1);
            }
        </style>
    `;

    if (listingType === 'stay') {
        htmlContent += renderStayDetails(listing, editMode, createField, formatDateTime, getImageUrl);
    } else {
        htmlContent += renderHostingDetails(listing, editMode, createField, formatDateTime, getImageUrl);
    }

    htmlContent += `
        <div class="action-buttons" style="display: flex; gap: 12px; justify-content: center; margin-top: 32px; padding-top: 24px; border-top: 2px solid var(--border);">
            ${!editMode ? `
                <button class="btn btn-edit" onclick="toggleListingEditMode()">
                    <i class="fa fa-edit"></i> Edit
                </button>
                <button class="btn btn-view" onclick="closeListingDetailsModal()">
                    <i class="fa fa-times"></i> Close
                </button>
            ` : `
                <button class="btn btn-view" onclick="cancelListingEdit()">
                    <i class="fa fa-times"></i> Cancel
                </button>
                <button class="btn btn-add" onclick="saveListingChanges()">
                    <i class="fa fa-save"></i> Save Changes
                </button>
            `}
        </div>
    `;

    content.innerHTML = htmlContent;
}

function renderStayDetails(listing, editMode, createField, formatDateTime, getImageUrl) {
    return `
        <div class="listing-details-grid">
            <div class="listing-details-section full-width">
                <h3>Main Image</h3>
                <div class="listing-image-container">
                    ${listing.main_image ? 
                        `<img id="main-image-preview" src="${getImageUrl(listing.main_image)}" alt="Main Image" onerror="this.onerror=null; this.src='../public/images/default_image.png'">` : 
                        '<p>No main image</p>'
                    }
                </div>
                ${editMode ? `
                    <div style="text-align: center; margin-top: 16px;">
                        <input type="file" id="edit_main_image" class="edit-field" data-field="main_image" accept="image/*" style="display: none;" onchange="previewMainImage(this)">
                        <button type="button" class="btn btn-edit" onclick="document.getElementById('edit_main_image').click()">
                            <i class="fa fa-upload"></i> Change Main Image
                        </button>
                        ${listing.main_image ? `
                            <button type="button" class="btn btn-delete" onclick="removeMainImage()" style="margin-left: 8px;">
                                <i class="fa fa-trash"></i> Remove
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>

            <div class="listing-details-section">
                <h3>Basic Information</h3>
                <div class="detail-row">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value">#${listing.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Title:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Title', 'title', listing.title, 'text') : (listing.title || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Description', 'description', listing.description, 'textarea') : (listing.description || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Location', 'location', listing.location, 'text') : (listing.location || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Property Type:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Property Type', 'property_type', listing.property_type, 'select', [
                        {value: 'house', label: 'House'},
                        {value: 'apartment', label: 'Apartment'},
                        {value: 'villa', label: 'Villa'},
                        {value: 'cabin', label: 'Cabin'},
                        {value: 'hotel', label: 'Hotel'},
                        {value: 'hostel', label: 'Hostel'},
                        {value: 'guesthouse', label: 'Guesthouse'},
                        {value: 'other', label: 'Other'}
                    ]) : (listing.property_type || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Active Status:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Active', 'is_active', listing.is_active, 'checkbox') : (listing.is_active == 1 ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Inactive</span>')}</div>
                </div>
            </div>

            <div class="listing-details-section">
                <h3>Property Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Bedrooms:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Bedrooms', 'number_of_bedrooms', listing.number_of_bedrooms, 'number') : (listing.number_of_bedrooms || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Bathrooms:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Bathrooms', 'number_of_bathrooms', listing.number_of_bathrooms, 'number') : (listing.number_of_bathrooms || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Max Guests:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Max Guests', 'max_guests', listing.max_guests, 'number') : (listing.max_guests || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Beds:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Number of Beds', 'number_of_beds', listing.number_of_beds, 'number') : (listing.number_of_beds || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Double Beds:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Double Beds', 'number_double_beds', listing.number_double_beds, 'number') : (listing.number_double_beds || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Single Beds:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Single Beds', 'number_single_beds', listing.number_single_beds, 'number') : (listing.number_single_beds || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Sofa Beds:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Sofa Beds', 'number_bunk_beds', listing.number_bunk_beds, 'number') : (listing.number_bunk_beds || 'N/A')}</div>
                </div>
            </div>

            <div class="listing-details-section">
                <h3>Pricing & Policies</h3>
                <div class="detail-row">
                    <span class="detail-label">Price per Night:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Price per Night', 'price_per_night', listing.price_per_night, 'number') : (listing.price_per_night ? `$${parseFloat(listing.price_per_night).toFixed(2)}` : 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Service Fee %:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Service Fee %', 'service_fee_percentage', listing.service_fee_percentage, 'number') : (listing.service_fee_percentage ? `${listing.service_fee_percentage}%` : 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cleaning Fee:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Cleaning Fee', 'cleaning_fee', listing.cleaning_fee, 'number') : (listing.cleaning_fee ? `$${parseFloat(listing.cleaning_fee).toFixed(2)}` : 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cancellation Policy:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Cancellation Policy', 'cancellation_policy', listing.cancellation_policy, 'select', [
                        {value: 'flexible', label: 'Flexible'},
                        {value: 'moderate', label: 'Moderate'},
                        {value: 'strict', label: 'Strict'}
                    ]) : (listing.cancellation_policy || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Check-in Time:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Check-in Time', 'check_in_time', listing.check_in_time, 'text') : (listing.check_in_time || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Check-out Time:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Check-out Time', 'check_out_time', listing.check_out_time, 'text') : (listing.check_out_time || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cash Enabled:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Cash Enabled', 'cash_enabled', listing.cash_enabled, 'checkbox') : (listing.cash_enabled == 1 ? 'Yes' : 'No')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Instant Book:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Instant Book', 'instant_book', listing.instant_book, 'checkbox') : (listing.instant_book == 1 ? 'Yes' : 'No')}</div>
                </div>
            </div>

            <div class="listing-details-section">
                <h3>Additional Information</h3>
                <div class="detail-row">
                    <span class="detail-label">House Rules:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('House Rules', 'house_rules', listing.house_rules, 'textarea') : (listing.house_rules || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Min Nights:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Min Nights', 'min_nights', listing.min_nights, 'number') : (listing.min_nights || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Max Nights:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Max Nights', 'max_nights', listing.max_nights, 'number') : (listing.max_nights || 'N/A')}</div>
                </div>
            </div>

            <div class="listing-details-section">
                <h3>Host Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Host Name:</span>
                    <span class="detail-value">${listing.host_name || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Host Email:</span>
                    <span class="detail-value">${listing.host_email || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Host ID:</span>
                    <span class="detail-value">#${listing.host_id || 'N/A'}</span>
                </div>
            </div>

            <div class="listing-details-section">
                <h3>Address</h3>
                <div class="detail-row">
                    <span class="detail-label">Country:</span>
                    <span class="detail-value">${listing.country || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">City:</span>
                    <span class="detail-value">${listing.city || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Street:</span>
                    <span class="detail-value">${listing.street || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Building:</span>
                    <span class="detail-value">${listing.building || 'N/A'}</span>
                </div>
                ${listing.floor ? `
                <div class="detail-row">
                    <span class="detail-label">Floor:</span>
                    <span class="detail-value">${listing.floor}</span>
                </div>
                ` : ''}
            </div>

            <div class="listing-details-section">
                <h3>Timestamps</h3>
                <div class="detail-row">
                    <span class="detail-label">Created At:</span>
                    <span class="detail-value">${formatDateTime(listing.created_at)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Updated At:</span>
                    <span class="detail-value">${formatDateTime(listing.updated_at)}</span>
                </div>
            </div>

            <div class="listing-details-section full-width">
                <h3>Additional Images ${editMode ? `<button type="button" class="btn btn-add" onclick="addAdditionalImage()" style="float: right; padding: 6px 12px; font-size: 12px;"><i class="fa fa-plus"></i> Add Image</button>` : ''}</h3>
                ${listing.images && listing.images.filter(img => !img.is_primary).length > 0 ? `
                <div class="additional-images-grid">
                    ${listing.images.filter(img => !img.is_primary).map((img, index) => `
                        <div class="image-item" data-image-id="${img.id}" style="position: relative;">
                            <img src="${getImageUrl(img.image)}" alt="${img.room || img.category || 'Additional image'}" onerror="this.onerror=null; this.src='../public/images/default_image.png'">
                            <small style="display: block; padding: 4px; background: rgba(0,0,0,0.7); color: white; text-align: center;">${img.room || img.category || 'General'}</small>
                            ${editMode ? `
                                <button type="button" class="btn btn-delete" onclick="removeAdditionalImage(${img.id})" style="position: absolute; top: 4px; right: 4px; padding: 4px 8px; font-size: 11px; background: rgba(220, 38, 38, 0.9); border: none; color: white; cursor: pointer; border-radius: 4px; z-index: 10;" title="Remove">
                                    <i class="fa fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : `<p style="text-align: center; color: #717171; padding: 20px;">No additional images</p>`}
                ${editMode ? `
                <div id="new-additional-images-container" style="margin-top: 16px;"></div>
                ` : ''}
            </div>

            ${listing.amenities && listing.amenities.length > 0 ? `
            <div class="listing-details-section full-width">
                <h3>Amenities (${listing.amenities.length})</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${listing.amenities.map(amenity => `
                        <span class="badge badge-info">${amenity.name}</span>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

function renderHostingDetails(listing, editMode, createField, formatDateTime, getImageUrl) {
    const isEvent = listingType === 'event';
    
    return `
        <div class="listing-details-grid">
            <div class="listing-details-section full-width">
                <h3>Main Image</h3>
                <div class="listing-image-container">
                    ${listing.main_image ? 
                        `<img id="main-image-preview" src="${getImageUrl(listing.main_image)}" alt="Main Image" onerror="this.onerror=null; this.src='../public/images/default_image.png'">` : 
                        '<p>No main image</p>'
                    }
                </div>
                ${editMode ? `
                    <div style="text-align: center; margin-top: 16px;">
                        <input type="file" id="edit_main_image" class="edit-field" data-field="main_image" accept="image/*" style="display: none;" onchange="previewMainImage(this)">
                        <button type="button" class="btn btn-edit" onclick="document.getElementById('edit_main_image').click()">
                            <i class="fa fa-upload"></i> Change Main Image
                        </button>
                        ${listing.main_image ? `
                            <button type="button" class="btn btn-delete" onclick="removeMainImage()" style="margin-left: 8px;">
                                <i class="fa fa-trash"></i> Remove
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>

            <div class="listing-details-section">
                <h3>Basic Information</h3>
                <div class="detail-row">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value">#${listing.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Title:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Title', 'title', listing.title, 'text') : (listing.title || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Description', 'description', listing.description, 'textarea') : (listing.description || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Location', 'location', listing.location, 'text') : (listing.location || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Active Status:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Active', 'is_active', listing.is_active, 'checkbox') : (listing.is_active == 1 ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Inactive</span>')}</div>
                </div>
            </div>

            <div class="listing-details-section">
                <h3>Pricing & Capacity</h3>
                <div class="detail-row">
                    <span class="detail-label">Price:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Price', 'price', listing.price, 'number') : (listing.price ? `$${parseFloat(listing.price).toFixed(2)}` : 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Price Per Person:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Price Per Person', 'price_per_person', listing.price_per_person, 'number') : (listing.price_per_person ? (listing.price_per_person == 1 ? 'Yes' : 'No') : 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Service Fee %:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Service Fee %', 'service_fee_percentage', listing.service_fee_percentage, 'number') : (listing.service_fee_percentage ? `${listing.service_fee_percentage}%` : 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Max Guests:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Max Guests', 'max_guests', listing.max_guests, 'number') : (listing.max_guests || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Min Guests:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Min Guests', 'min_guests', listing.min_guests, 'number') : (listing.min_guests || 'N/A')}</div>
                </div>
                ${listing.max_guests_per_price ? `
                <div class="detail-row">
                    <span class="detail-label">Max Guests Per Price:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Max Guests Per Price', 'max_guests_per_price', listing.max_guests_per_price, 'number') : (listing.max_guests_per_price || 'N/A')}</div>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">Cancellation Policy:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Cancellation Policy', 'cancellation_policy', listing.cancellation_policy, 'select', [
                        {value: 'flexible', label: 'Flexible'},
                        {value: 'moderate', label: 'Moderate'},
                        {value: 'strict', label: 'Strict'}
                    ]) : (listing.cancellation_policy || 'N/A')}</div>
                </div>
            </div>

            <div class="listing-details-section">
                <h3>${isEvent ? 'Event' : 'Experience'} Details</h3>
                ${!isEvent ? `
                <div class="detail-row">
                    <span class="detail-label">Length (hours):</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Length Hours', 'length_hours', listing.length_hours, 'number') : (listing.length_hours || 'N/A')}</div>
                </div>
                ` : `
                <div class="detail-row">
                    <span class="detail-label">Start Date:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Start Date', 'date_start', listing.date_start, 'date') : (listing.date_start || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">End Date:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('End Date', 'date_end', listing.date_end, 'date') : (listing.date_end || 'N/A')}</div>
                </div>
                `}
                <div class="detail-row">
                    <span class="detail-label">Start Time:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Start Time', 'hour_start', listing.hour_start, 'time') : (listing.hour_start || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">End Time:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('End Time', 'hour_end', listing.hour_end, 'time') : (listing.hour_end || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Difficulty:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Difficulty', 'difficulty', listing.difficulty, 'select', [
                        {value: 'easy', label: 'Easy'},
                        {value: 'moderate', label: 'Moderate'},
                        {value: 'challenging', label: 'Challenging'},
                        {value: 'expert', label: 'Expert'}
                    ]) : (listing.difficulty || 'N/A')}</div>
                </div>
                ${listing.min_age ? `
                <div class="detail-row">
                    <span class="detail-label">Min Age:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Min Age', 'min_age', listing.min_age, 'number') : (listing.min_age || 'N/A')}</div>
                </div>
                ` : ''}
                ${listing.max_age ? `
                <div class="detail-row">
                    <span class="detail-label">Max Age:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Max Age', 'max_age', listing.max_age, 'number') : (listing.max_age || 'N/A')}</div>
                </div>
                ` : ''}
            </div>

            <div class="listing-details-section">
                <h3>Host Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Host Name:</span>
                    <span class="detail-value">${listing.host_name || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Host Email:</span>
                    <span class="detail-value">${listing.host_email || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Host ID:</span>
                    <span class="detail-value">#${listing.host_id || 'N/A'}</span>
                </div>
            </div>

            <div class="listing-details-section">
                <h3>Address</h3>
                <div class="detail-row">
                    <span class="detail-label">Country:</span>
                    <span class="detail-value">${listing.country || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">City:</span>
                    <span class="detail-value">${listing.city || 'N/A'}</span>
                </div>
                ${listing.street ? `
                <div class="detail-row">
                    <span class="detail-label">Street:</span>
                    <span class="detail-value">${listing.street}</span>
                </div>
                ` : ''}
                ${listing.building ? `
                <div class="detail-row">
                    <span class="detail-label">Building:</span>
                    <span class="detail-value">${listing.building}</span>
                </div>
                ` : ''}
            </div>

            <div class="listing-details-section">
                <h3>Timestamps</h3>
                <div class="detail-row">
                    <span class="detail-label">Created At:</span>
                    <span class="detail-value">${formatDateTime(listing.created_at)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Updated At:</span>
                    <span class="detail-value">${formatDateTime(listing.updated_at)}</span>
                </div>
            </div>

            <div class="listing-details-section full-width">
                <h3>Additional Images ${editMode ? `<button type="button" class="btn btn-add" onclick="addAdditionalImage()" style="float: right; padding: 6px 12px; font-size: 12px;"><i class="fa fa-plus"></i> Add Image</button>` : ''}</h3>
                ${listing.images && listing.images.filter(img => !img.is_primary).length > 0 ? `
                <div class="additional-images-grid">
                    ${listing.images.filter(img => !img.is_primary).map((img, index) => `
                        <div class="image-item" data-image-id="${img.id}">
                            <img src="${getImageUrl(img.image)}" alt="${img.category || 'Additional image'}" onerror="this.onerror=null; this.src='../public/images/default_image.png'">
                            <small style="display: block; padding: 4px; background: rgba(0,0,0,0.7); color: white; text-align: center;">${img.category || 'General'}</small>
                            ${editMode ? `
                                <div style="position: absolute; top: 4px; right: 4px; display: flex; gap: 4px;">
                                    <button type="button" class="btn btn-delete" onclick="removeAdditionalImage(${img.id})" style="padding: 4px 8px; font-size: 11px; background: rgba(220, 38, 38, 0.9);" title="Remove">
                                        <i class="fa fa-trash"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : `<p style="text-align: center; color: #717171; padding: 20px;">No additional images</p>`}
                ${editMode ? `
                <div id="new-additional-images-container" style="margin-top: 16px;"></div>
                ` : ''}
            </div>

            ${listing.subtypes && listing.subtypes.length > 0 ? `
            <div class="listing-details-section full-width">
                <h3>Subtypes (${listing.subtypes.length})</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${listing.subtypes.map(subtype => `
                        <span class="badge badge-info">${subtype.name}</span>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

function toggleListingEditMode() {
    if (!currentEditingListing) return;
    isEditModeListing = true;
    additionalImageCounter = 0; // Reset counter when entering edit mode
    renderListingDetails(currentEditingListing, true);
}

function cancelListingEdit() {
    if (!currentEditingListing) return;
    isEditModeListing = false;
    renderListingDetails(currentEditingListing, false);
}

function closeListingDetailsModal() {
    document.getElementById('listing-details-modal').classList.remove('active');
    isEditModeListing = false;
    currentEditingListing = null;
}

async function saveListingChanges() {
    if (!currentEditingListing) return;

    const updateData = {
        id: currentEditingListing.id
    };

    // Collect all editable fields (excluding file inputs)
    const editableFields = document.querySelectorAll('.edit-field:not([type="file"])');
    editableFields.forEach(field => {
        const fieldName = field.dataset.field;
        let value = null;

        if (field.type === 'checkbox') {
            value = field.checked ? 1 : 0;
        } else if (field.type === 'number') {
            value = field.value !== '' && field.value !== null ? parseFloat(field.value) : null;
        } else if (field.tagName === 'SELECT') {
            value = field.value === '' ? null : field.value;
        } else if (field.tagName === 'TEXTAREA') {
            value = field.value.trim() === '' ? null : field.value.trim();
        } else if (field.type === 'date' || field.type === 'time') {
            value = field.value === '' ? null : field.value;
        } else if (field.type === 'email' || field.type === 'tel' || field.type === 'text') {
            value = field.value.trim() === '' ? null : field.value.trim();
        } else {
            value = field.value.trim() === '' ? null : field.value.trim();
        }

        updateData[fieldName] = value;
    });

    // Handle main image upload if changed
    const mainImageFile = document.getElementById('edit_main_image')?.files[0];
    if (mainImageFile) {
        try {
            const formData = new FormData();
            formData.append('main_image', mainImageFile);
            formData.append('listing_id', currentEditingListing.id);
            formData.append('listing_type', listingType);

            const token = localStorage.getItem('admin_token');
            const response = await fetch('../public/backend/api/admin/upload-listing-image.php', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            if (!result.success) {
                window.toast.error('Error uploading image: ' + result.message);
                return;
            }
            // Image uploaded successfully, path is in result.file_path
        } catch (error) {
            console.error('[ADMIN] Error uploading image:', error);
            window.toast.error('Error uploading image');
            return;
        }
    }

    // Handle removed main image
    if (window.mainImageRemoved) {
        updateData.main_image = null;
    }

    // Handle new additional images
    const newImageInputs = document.querySelectorAll('[id^="new_image_file_"]');
    const newImagePromises = [];
    
    for (const input of newImageInputs) {
        if (input.files && input.files[0]) {
            const imageIndex = input.id.replace('new_image_file_', '');
            const categorySelect = document.getElementById(`new_image_category_${imageIndex}`);
            const category = categorySelect ? categorySelect.value : 'General';
            
            const formData = new FormData();
            formData.append('additional_image', input.files[0]);
            formData.append('listing_id', currentEditingListing.id);
            formData.append('listing_type', listingType);
            
            if (listingType === 'stay') {
                formData.append('room', category);
            } else {
                formData.append('category', category);
            }

            const token = localStorage.getItem('admin_token');
            newImagePromises.push(
                fetch('../public/backend/api/admin/upload-additional-image.php', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                }).then(response => response.json())
            );
        }
    }

    try {
        // Upload new additional images first
        if (newImagePromises.length > 0) {
            const uploadResults = await Promise.all(newImagePromises);
            const failedUploads = uploadResults.filter(r => !r.success);
            if (failedUploads.length > 0) {
                window.toast.error(`${failedUploads.length} image(s) failed to upload`);
            } else {
                window.toast.success(`${uploadResults.length} additional image(s) uploaded successfully!`);
            }
        }
        const endpoint = listingType === 'stay'
            ? '../public/backend/api/admin/update-stay.php'
            : '../public/backend/api/admin/update-hosting.php';

        const data = await window.AdminAuth.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(updateData)
        });

        if (data.success) {
            // Handle image upload if pending
            if (window.pendingMainImage) {
                // TODO: Upload image via separate endpoint
                // For now, just clear the flag
                window.pendingMainImage = null;
            }

            window.toast.success('Listing updated successfully!');
            // Reset removed flag
            window.mainImageRemoved = false;
            // Reset additional image counter
            additionalImageCounter = 0;
            // Reload listing data to show updated information
            await viewListingDetails(currentEditingListing.id);
            isEditModeListing = false;
            // Refresh listings list
            loadListings();
        } else {
            window.toast.error('Error: ' + (data.message || 'Failed to update listing'));
        }
    } catch (error) {
        console.error('[ADMIN] Error updating listing:', error);
        window.toast.error('Error updating listing. Please try again.');
    }
}

function previewMainImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('main-image-preview');
            const previewText = document.getElementById('main-image-preview-text');
            if (preview) {
                preview.src = e.target.result;
            } else if (previewText) {
                previewText.outerHTML = `<img id="main-image-preview" src="${e.target.result}" alt="Main Image" style="max-width: 300px; max-height: 300px; border-radius: 8px; border: 3px solid var(--border);">`;
            }
            window.mainImageRemoved = false;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeMainImage() {
    if (confirm('Are you sure you want to remove the main image?')) {
        const preview = document.getElementById('main-image-preview');
        const input = document.getElementById('edit_main_image');
        
        const previewText = document.getElementById('main-image-preview-text');
        if (preview) {
            preview.remove();
        }
        if (!previewText) {
            const container = document.querySelector('.listing-image-container');
            container.innerHTML = '<p id="main-image-preview-text">No main image</p>';
        }
        if (input) {
            input.value = '';
        }
        window.mainImageRemoved = true;
    }
}

// Additional image management
let additionalImageCounter = 0;

function addAdditionalImage() {
    const container = document.getElementById('new-additional-images-container');
    if (!container) return;

    const imageIndex = additionalImageCounter++;
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'new-image-upload-item';
    imageWrapper.style.cssText = 'margin-bottom: 16px; padding: 16px; border: 2px dashed #ddd; border-radius: 8px; background: #f9f9f9;';
    
    const categoryLabel = listingType === 'stay' ? 'Room Type' : 'Category';
    const categoryOptions = listingType === 'stay' 
        ? ['Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bathroom 1', 'Bathroom 2', 'Living Room', 'Kitchen', 'Dining Room', 'Balcony', 'Other']
        : ['General', 'Exterior', 'Interior', 'Activity', 'Equipment', 'Location', 'Group', 'Other'];

    imageWrapper.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center;">
            <div>
                <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 600;">${categoryLabel}:</label>
                <select id="new_image_category_${imageIndex}" class="edit-field" style="width: 100%;">
                    ${categoryOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    ${categoryOptions.includes('Other') ? '' : '<option value="Other">Other</option>'}
                </select>
            </div>
            <div>
                <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 600;">Image:</label>
                <input type="file" id="new_image_file_${imageIndex}" accept="image/*" class="edit-field" style="width: 100%; padding: 8px;">
            </div>
            <div style="grid-column: 1 / -1;">
                <button type="button" class="btn btn-delete" onclick="removeNewImageUpload(${imageIndex})" style="width: 100%;">
                    <i class="fa fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(imageWrapper);
}

function removeNewImageUpload(imageIndex) {
    const wrapper = document.querySelector(`.new-image-upload-item:has(#new_image_file_${imageIndex})`);
    if (wrapper) {
        wrapper.remove();
    }
}

async function removeAdditionalImage(imageId) {
    if (!confirm('Are you sure you want to remove this image?')) {
        return;
    }

    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch('../public/backend/api/admin/delete-additional-image.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                image_id: imageId,
                listing_type: listingType
            })
        });

        const result = await response.json();
        if (result.success) {
            window.toast.success('Image removed successfully!');
            // Remove from DOM
            const imageItem = document.querySelector(`.image-item[data-image-id="${imageId}"]`);
            if (imageItem) {
                imageItem.remove();
            }
            // Reload listing to refresh counts
            if (currentEditingListing) {
                await viewListingDetails(currentEditingListing.id);
                isEditModeListing = true;
                renderListingDetails(currentEditingListing, true);
            }
        } else {
            window.toast.error('Error: ' + (result.message || 'Failed to remove image'));
        }
    } catch (error) {
        console.error('[ADMIN] Error removing image:', error);
        window.toast.error('Error removing image. Please try again.');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('listing-details-modal');
    if (e.target === modal) {
        closeListingDetailsModal();
    }
});

loadListings();


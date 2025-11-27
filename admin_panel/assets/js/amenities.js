/**
 * Admin Amenities Management
 */

// Require admin authentication
if (!window.AdminAuth.requireAdmin()) {
    // Will redirect if not admin
}

// Display admin info
const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

let allAmenities = [];
const amenityIconFileInput = document.getElementById('amenity-icon-file');
const amenityIconPreview = document.getElementById('amenity-icon-preview');
const amenityIconExistingInput = document.getElementById('amenity-icon-existing');
const defaultAmenityPreview = '<span class="icon-preview-placeholder">No icon selected</span>';

if (amenityIconFileInput) {
    amenityIconFileInput.addEventListener('change', () => {
        const file = amenityIconFileInput.files[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);
            setAmenityIconPreview(tempUrl, true);
        } else {
            setAmenityIconPreview(amenityIconExistingInput.value);
        }
    });
}

if (amenityIconPreview) {
    const initialIcon = amenityIconExistingInput ? amenityIconExistingInput.value : '';
    setAmenityIconPreview(initialIcon);
}

// Load all amenities
async function loadAmenities() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/amenities.php');

        if (data.success && data.data) {
            allAmenities = data.data;
            displayAmenities(allAmenities);
        } else {
            showError('Failed to load amenities');
        }
    } catch (error) {
        console.error('[ADMIN] Error loading amenities:', error);
        showError('Error loading amenities');
    }
}

// Display amenities in table
function displayAmenities(amenities) {
    const container = document.getElementById('amenities-table');

    if (!amenities || amenities.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-cube"></i><p>No amenities found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Icon</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${amenities.map(amenity => `
                    <tr>
                        <td>#${amenity.id}</td>
                        <td>${amenity.name}</td>
                        <td>${amenity.category || 'N/A'}</td>
                        <td>${renderAmenityIcon(amenity.icon_url)}</td>
                        <td>${formatDate(amenity.created_at)}</td>
                        <td>
                            <button class="btn btn-edit" onclick="editAmenity(${amenity.id})">
                                <i class="fa fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-delete" onclick="deleteAmenity(${amenity.id}, '${amenity.name}')">
                                <i class="fa fa-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderAmenityIcon(iconValue) {
    if (!iconValue) {
        return 'N/A';
    }
    const isUrl = /^https?:\/\//i.test(iconValue);
    if (isUrl) {
        return `<img src="${iconValue}" alt="Amenity icon" class="icon-thumb" loading="lazy">`;
    }
    return `<i class="${iconValue}"></i>`;
}

// Search amenities
document.getElementById('search-amenities').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const filtered = allAmenities.filter(amenity =>
        amenity.name.toLowerCase().includes(query) ||
        (amenity.category && amenity.category.toLowerCase().includes(query))
    );
    displayAmenities(filtered);
});

// Open add modal
function openAddModal() {
    document.getElementById('modal-title').textContent = 'Add Amenity';
    document.getElementById('amenity-id').value = '';
    document.getElementById('amenity-name').value = '';
    document.getElementById('amenity-category').value = '';
    if (amenityIconExistingInput) amenityIconExistingInput.value = '';
    if (amenityIconFileInput) amenityIconFileInput.value = '';
    setAmenityIconPreview('');
    document.getElementById('edit-amenity-modal').style.display = 'flex';
}

// Edit amenity
function editAmenity(amenityId) {
    const amenity = allAmenities.find(a => a.id === amenityId);
    if (!amenity) return;

    document.getElementById('modal-title').textContent = 'Edit Amenity';
    document.getElementById('amenity-id').value = amenity.id;
    document.getElementById('amenity-name').value = amenity.name;
    document.getElementById('amenity-category').value = amenity.category || '';
    if (amenityIconExistingInput) amenityIconExistingInput.value = amenity.icon_url || '';
    if (amenityIconFileInput) amenityIconFileInput.value = '';
    setAmenityIconPreview(amenity.icon_url || '');
    document.getElementById('edit-amenity-modal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('edit-amenity-modal').style.display = 'none';
}

// Handle form submission
document.getElementById('edit-amenity-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const amenityId = document.getElementById('amenity-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('amenity-name').value);
    formData.append('category', document.getElementById('amenity-category').value || '');

    const iconFile = amenityIconFileInput ? amenityIconFileInput.files[0] : null;
    const existingIcon = amenityIconExistingInput ? amenityIconExistingInput.value : '';
    if (iconFile) {
        formData.append('icon_file', iconFile);
    } else if (existingIcon) {
        formData.append('icon_url', existingIcon);
    }

    try {
        let url;
        if (amenityId) {
            // Update
            formData.append('id', amenityId);
            url = '../public/backend/api/admin/update-amenity.php';
        } else {
            // Create
            url = '../public/backend/api/admin/create-amenity.php';
        }

        const data = await window.AdminAuth.apiRequest(url, {
            method: 'POST',
            body: formData
        });

        if (data.success) {
            alert(data.message);
            closeModal();
            loadAmenities();
        } else {
            alert(data.message || 'Operation failed');
        }
    } catch (error) {
        console.error('[ADMIN] Error saving amenity:', error);
        alert('Error saving amenity');
    }
});

// Delete amenity
async function deleteAmenity(amenityId, amenityName) {
    if (!confirm(`Are you sure you want to delete "${amenityName}"?`)) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/delete-amenity.php', 'POST', { id: amenityId });

        if (data.success) {
            alert('Amenity deleted successfully');
            loadAmenities();
        } else {
            alert(data.message || 'Failed to delete amenity');
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting amenity:', error);
        alert('Error deleting amenity');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showError(message) {
    document.getElementById('amenities-table').innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

function setAmenityIconPreview(url, isTemp = false) {
    if (!amenityIconPreview) return;
    if (!url) {
        amenityIconPreview.innerHTML = defaultAmenityPreview;
        return;
    }
    const label = isTemp ? 'New icon (not saved yet)' : 'Current icon';
    amenityIconPreview.innerHTML = `
        <img src="${url}" alt="Amenity icon preview">
        <span>${label}</span>
    `;
}

// Load data on page load
loadAmenities();

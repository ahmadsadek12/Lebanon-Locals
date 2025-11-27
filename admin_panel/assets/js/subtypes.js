/**
 * Admin Subtypes Management
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

let allSubtypes = [];
const subtypeIconFileInput = document.getElementById('subtype-icon-file');
const subtypeIconPreview = document.getElementById('subtype-icon-preview');
const subtypeIconExistingInput = document.getElementById('subtype-icon-existing');
const defaultSubtypePreview = '<span class="icon-preview-placeholder">No icon selected</span>';

if (subtypeIconFileInput) {
    subtypeIconFileInput.addEventListener('change', () => {
        const file = subtypeIconFileInput.files[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);
            setSubtypeIconPreview(tempUrl, true);
        } else {
            setSubtypeIconPreview(subtypeIconExistingInput.value);
        }
    });
}

if (subtypeIconPreview) {
    const initialValue = subtypeIconExistingInput ? subtypeIconExistingInput.value : '';
    setSubtypeIconPreview(initialValue);
}

// Load all subtypes
async function loadSubtypes() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/subtypes.php');

        if (data.success && data.data) {
            allSubtypes = data.data;
            displaySubtypes(allSubtypes);
        } else {
            showError('Failed to load subtypes');
        }
    } catch (error) {
        console.error('[ADMIN] Error loading subtypes:', error);
        showError('Error loading subtypes');
    }
}

// Display subtypes in table
function displaySubtypes(subtypes) {
    const container = document.getElementById('subtypes-table');

    if (!subtypes || subtypes.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-tags"></i><p>No subtypes found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Icon</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${subtypes.map(subtype => `
                    <tr>
                        <td>#${subtype.id}</td>
                        <td>${subtype.name}</td>
                        <td><span class="badge badge-${getCategoryColor(subtype.category)}">${subtype.category}</span></td>
                        <td>${subtype.description ? (subtype.description.substring(0, 50) + '...') : 'N/A'}</td>
                        <td>${renderSubtypeIcon(subtype.icon_url)}</td>
                        <td>${formatDate(subtype.created_at)}</td>
                        <td>
                            <button class="btn btn-edit" onclick="editSubtype(${subtype.id})">
                                <i class="fa fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-delete" onclick="deleteSubtype(${subtype.id}, '${subtype.name}')">
                                <i class="fa fa-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getCategoryColor(category) {
    const colorMap = {
        'experience': 'info',
        'event': 'warning',
        'stay': 'success'
    };
    return colorMap[category] || 'secondary';
}

function renderSubtypeIcon(iconValue) {
    if (!iconValue) {
        return 'N/A';
    }
    const isUrl = /^https?:\/\//i.test(iconValue);
    if (isUrl) {
        return `<img src="${iconValue}" alt="Subtype icon" class="icon-thumb" loading="lazy">`;
    }
    return `<i class="${iconValue}"></i>`;
}

// Filter by category
document.getElementById('filter-category').addEventListener('change', function(e) {
    const category = e.target.value;
    const searchQuery = document.getElementById('search-subtypes').value.toLowerCase();

    let filtered = allSubtypes;
    if (category) {
        filtered = filtered.filter(s => s.category === category);
    }
    if (searchQuery) {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(searchQuery) ||
            (s.description && s.description.toLowerCase().includes(searchQuery))
        );
    }

    displaySubtypes(filtered);
});

// Search subtypes
document.getElementById('search-subtypes').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const category = document.getElementById('filter-category').value;

    let filtered = allSubtypes;
    if (category) {
        filtered = filtered.filter(s => s.category === category);
    }
    if (query) {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(query) ||
            (s.description && s.description.toLowerCase().includes(query))
        );
    }

    displaySubtypes(filtered);
});

// Open add modal
function openAddModal() {
    document.getElementById('modal-title').textContent = 'Add Subtype';
    document.getElementById('subtype-id').value = '';
    document.getElementById('subtype-name').value = '';
    document.getElementById('subtype-category').value = '';
    document.getElementById('subtype-description').value = '';
    if (subtypeIconExistingInput) subtypeIconExistingInput.value = '';
    if (subtypeIconFileInput) subtypeIconFileInput.value = '';
    setSubtypeIconPreview('');
    document.getElementById('edit-subtype-modal').style.display = 'flex';
}

// Edit subtype
function editSubtype(subtypeId) {
    const subtype = allSubtypes.find(s => s.id === subtypeId);
    if (!subtype) return;

    document.getElementById('modal-title').textContent = 'Edit Subtype';
    document.getElementById('subtype-id').value = subtype.id;
    document.getElementById('subtype-name').value = subtype.name;
    document.getElementById('subtype-category').value = subtype.category;
    document.getElementById('subtype-description').value = subtype.description || '';
    if (subtypeIconExistingInput) subtypeIconExistingInput.value = subtype.icon_url || '';
    if (subtypeIconFileInput) subtypeIconFileInput.value = '';
    setSubtypeIconPreview(subtype.icon_url || '');
    document.getElementById('edit-subtype-modal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('edit-subtype-modal').style.display = 'none';
}

// Handle form submission
document.getElementById('edit-subtype-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const subtypeId = document.getElementById('subtype-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('subtype-name').value);
    formData.append('category', document.getElementById('subtype-category').value);
    formData.append('description', document.getElementById('subtype-description').value || '');

    const iconFile = subtypeIconFileInput ? subtypeIconFileInput.files[0] : null;
    const existingIcon = subtypeIconExistingInput ? subtypeIconExistingInput.value : '';
    if (iconFile) {
        formData.append('icon_file', iconFile);
    } else if (existingIcon) {
        formData.append('icon_url', existingIcon);
    }

    try {
        let url;
        if (subtypeId) {
            formData.append('id', subtypeId);
            url = '../public/backend/api/admin/update-subtype.php';
        } else {
            url = '../public/backend/api/admin/create-subtype.php';
        }

        const data = await window.AdminAuth.apiRequest(url, {
            method: 'POST',
            body: formData
        });

        if (data.success) {
            alert(data.message);
            closeModal();
            loadSubtypes();
        } else {
            alert(data.message || 'Operation failed');
        }
    } catch (error) {
        console.error('[ADMIN] Error saving subtype:', error);
        alert('Error saving subtype');
    }
});

// Delete subtype
async function deleteSubtype(subtypeId, subtypeName) {
    if (!confirm(`Are you sure you want to delete "${subtypeName}"?`)) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/delete-subtype.php', 'POST', { id: subtypeId });

        if (data.success) {
            alert('Subtype deleted successfully');
            loadSubtypes();
        } else {
            alert(data.message || 'Failed to delete subtype');
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting subtype:', error);
        alert('Error deleting subtype');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showError(message) {
    document.getElementById('subtypes-table').innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

function setSubtypeIconPreview(url, isTemp = false) {
    if (!subtypeIconPreview) return;
    if (!url) {
        subtypeIconPreview.innerHTML = defaultSubtypePreview;
        return;
    }
    const label = isTemp ? 'New icon (not saved yet)' : 'Current icon';
    subtypeIconPreview.innerHTML = `
        <img src="${url}" alt="Subtype icon preview">
        <span>${label}</span>
    `;
}

// Load data on page load
loadSubtypes();

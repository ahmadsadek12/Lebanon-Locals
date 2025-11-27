/**
 * Admin Users Management
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

let allUsers = [];

// Load all users
async function loadUsers() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/users.php');

        if (data.success && data.data) {
            allUsers = data.data;
            displayUsers(allUsers);
        } else {
            showError('Failed to load users');
        }
    } catch (error) {
        console.error('[ADMIN] Error loading users:', error);
        showError('Error loading users');
    }
}

// Display users in table
function displayUsers(users) {
    const container = document.getElementById('users-table');
    
    if (!users || users.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-users"></i><p>No users found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Verified</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>#${user.id}</td>
                        <td>${user.first_name} ${user.last_name}</td>
                        <td>${user.email}</td>
                        <td><span class="badge badge-${user.user_type === 'admin' ? 'danger' : user.user_type === 'host' ? 'warning' : 'info'}">${user.user_type}</span></td>
                        <td>${user.is_verified == 1 ? '<span class="badge badge-success"><i class="fa fa-check"></i> Verified</span>' : '<span class="badge badge-secondary">Not Verified</span>'}</td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>
                            <button class="btn btn-edit" onclick="editUser(${user.id})">
                                <i class="fa fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-delete" onclick="deleteUser(${user.id}, '${user.first_name} ${user.last_name}')">
                                <i class="fa fa-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Search users
document.getElementById('search-users').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const filtered = allUsers.filter(user => 
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.user_type.toLowerCase().includes(query)
    );
    displayUsers(filtered);
});

// Edit user
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('modal-title').textContent = 'Edit User';
    document.getElementById('user-id').value = user.id;
    document.getElementById('first-name').value = user.first_name;
    document.getElementById('last-name').value = user.last_name;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-type').value = user.user_type;
    document.getElementById('user-verified').value = user.is_verified;

    document.getElementById('edit-user-modal').classList.add('active');
}

// Add new user
function openAddUserModal() {
    document.getElementById('modal-title').textContent = 'Add New User';
    document.getElementById('edit-user-form').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('edit-user-modal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('edit-user-modal').classList.remove('active');
}

// Handle form submission
document.getElementById('edit-user-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const formData = {
        id: userId || null,
        first_name: document.getElementById('first-name').value,
        last_name: document.getElementById('last-name').value,
        email: document.getElementById('user-email').value,
        user_type: document.getElementById('user-type').value,
        is_verified: document.getElementById('user-verified').value
    };

    try {
        const endpoint = userId 
            ? '../public/backend/api/admin/update-user.php'
            : '../public/backend/api/admin/create-user.php';

        const data = await window.AdminAuth.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (data.success) {
            alert(userId ? 'User updated successfully' : 'User created successfully');
            closeModal();
            loadUsers();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('[ADMIN] Error saving user:', error);
        alert('Error saving user');
    }
});

// Delete user
async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
        return;
    }

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/delete-user.php', {
            method: 'POST',
            body: JSON.stringify({ id: userId })
        });

        if (data.success) {
            alert('User deleted successfully');
            loadUsers();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting user:', error);
        alert('Error deleting user');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showError(message) {
    document.getElementById('users-table').innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

// Load users on page load
loadUsers();


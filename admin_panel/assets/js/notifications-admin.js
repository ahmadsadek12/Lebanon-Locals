/**
 * Admin Notifications Viewer
 */

if (!window.AdminAuth.requireAdmin()) {}

const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

let allNotifications = [];

async function loadNotifications() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/notifications.php');
        if (data.success && data.data) {
            allNotifications = data.data;
            displayNotifications(allNotifications);
        } else {
            showError('Failed to load notifications');
        }
    } catch (error) {
        console.error('[ADMIN] Error loading notifications:', error);
        showError('Error loading notifications');
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notifications-table');

    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-bell"></i><p>No notifications found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${notifications.map(notif => `
                    <tr>
                        <td>#${notif.id}</td>
                        <td>${notif.user_name || 'N/A'}</td>
                        <td><span class="badge badge-${getTypeColor(notif.notification_type)}">${notif.notification_type}</span></td>
                        <td>${notif.title}</td>
                        <td>${notif.message ? notif.message.substring(0, 50) + '...' : 'N/A'}</td>
                        <td>${notif.is_read == 1 ? '<span class="badge badge-success">Read</span>' : '<span class="badge badge-warning">Unread</span>'}</td>
                        <td>${formatDate(notif.created_at)}</td>
                        <td>
                            <button class="btn btn-delete" onclick="deleteNotification(${notif.id})">
                                <i class="fa fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getTypeColor(type) {
    const colorMap = {
        'booking': 'info',
        'message': 'primary',
        'review': 'success',
        'payment': 'warning',
        'system': 'secondary'
    };
    return colorMap[type] || 'secondary';
}

document.getElementById('filter-type').addEventListener('change', applyFilters);
document.getElementById('filter-read').addEventListener('change', applyFilters);
document.getElementById('search-notifications').addEventListener('input', applyFilters);

function applyFilters() {
    const type = document.getElementById('filter-type').value;
    const readStatus = document.getElementById('filter-read').value;
    const searchQuery = document.getElementById('search-notifications').value.toLowerCase();

    let filtered = allNotifications;

    if (type) {
        filtered = filtered.filter(n => n.notification_type === type);
    }
    if (readStatus !== '') {
        filtered = filtered.filter(n => n.is_read == readStatus);
    }
    if (searchQuery) {
        filtered = filtered.filter(n =>
            (n.user_name && n.user_name.toLowerCase().includes(searchQuery)) ||
            (n.title && n.title.toLowerCase().includes(searchQuery)) ||
            (n.message && n.message.toLowerCase().includes(searchQuery))
        );
    }

    displayNotifications(filtered);
}

async function deleteNotification(notificationId) {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/delete-notification.php', 'POST', { id: notificationId });
        if (data.success) {
            alert('Notification deleted successfully');
            loadNotifications();
        } else {
            alert(data.message || 'Failed to delete notification');
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting notification:', error);
        alert('Error deleting notification');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showError(message) {
    document.getElementById('notifications-table').innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

loadNotifications();

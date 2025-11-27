/**
 * Notifications System
 * Handles notification polling, display, and interaction
 */

(function() {
    'use strict';

    let notificationPollInterval = null;
    let notifications = [];
    let isDropdownOpen = false;
    let listenersBound = false;

    /**
     * Initialize notifications system
     */
    function init() {
        // Wait for Auth to be ready
        if (!window.Auth) {
            setTimeout(init, 100);
            return;
        }

        showNotificationsButton();
        setupEventListeners();

        // If already logged in, prime notifications + polling
        if (window.Auth.isAuthenticated()) {
            loadNotifications();
            startPolling();
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        const notificationsBtn = document.getElementById('notifications-btn');
        const notificationsClose = document.getElementById('notifications-close');
        const dropdown = document.getElementById('notifications-dropdown');

        // If header not loaded yet, retry shortly
        if (!notificationsBtn || !dropdown) {
            setTimeout(setupEventListeners, 100);
            return;
        }

        if (listenersBound) return;

        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', handleNotificationsButtonClick);
        }

        if (notificationsClose) {
            notificationsClose.addEventListener('click', function(e) {
                e.stopPropagation();
                closeDropdown();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isDropdownOpen) {
                closeDropdown();
            }
        });

        document.addEventListener('click', function(e) {
            if (isDropdownOpen && dropdown && !dropdown.contains(e.target) && 
                notificationsBtn && !notificationsBtn.contains(e.target)) {
                closeDropdown();
            }
        });

        listenersBound = true;
    }

    /**
     * Toggle notifications dropdown
     */
    function toggleDropdown(options = {}) {
        const dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown) return;

        if (isDropdownOpen) {
            closeDropdown();
        } else {
            openDropdown(options);
        }
    }

    /**
     * Open notifications dropdown
     */
    function openDropdown(options = {}) {
        const dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown) return;

        dropdown.style.display = 'block';
        requestAnimationFrame(() => {
            dropdown.style.opacity = '1';
        });
        isDropdownOpen = true;
        if (!options.skipLoad) {
            loadNotifications(); // Refresh notifications when opening
        }
    }

    /**
     * Close notifications dropdown
     */
    function closeDropdown() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown) {
            isDropdownOpen = false;
            return;
        }

        dropdown.style.opacity = '0';
        setTimeout(() => {
            dropdown.style.display = 'none';
        }, 150);
        isDropdownOpen = false;
    }

    /**
     * Load notifications from API
     */
    async function loadNotifications() {
        try {
            // Prefer the same key auth.js uses ('auth_token'), but fall back to 'token' if present
            const token =
                localStorage.getItem('auth_token') ||
                localStorage.getItem('token');

            // No JWT at all → real guest
            if (!token) {
                renderGuestPrompt();
                return;
            }

            renderPlaceholder('Loading notifications...', 'loading');

            // Use existing notifications API backed by the `notifications` table
            const response = await fetch('backend/api/user-notifications.php?unread_only=true', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }

            const data = await response.json();

            if (data.success) {
                notifications = data.notifications || [];
                updateNotificationCount(data.unread_count || 0);
                renderNotifications();
            } else {
                renderPlaceholder(data.message || 'Unable to load notifications.');
            }
        } catch (error) {
            console.error('[NOTIFICATIONS] Error loading notifications:', error);
            renderPlaceholder('Unable to load notifications right now.', 'error');
        }
    }

    /**
     * Update notification count badge
     */
    function updateNotificationCount(count) {
        const countElement = document.getElementById('notifications-count');
        if (countElement) {
            if (count > 0) {
                countElement.textContent = count > 99 ? '99+' : count;
                countElement.classList.remove('hidden');
            } else {
                countElement.classList.add('hidden');
            }
        }
    }

    /**
     * Render notifications list
     */
    function renderNotifications() {
        const listContainer = document.getElementById('notifications-list');
        if (!listContainer) return;

        if (notifications.length === 0) {
            renderPlaceholder('You have no notifications yet.');
            return;
        }

        listContainer.innerHTML = notifications.map(notif => {
            const date = new Date(notif.created_at);
            const timeAgo = getTimeAgo(date);
            const isUnread = notif.is_read == 0;

            return `
                <div class="notification-item ${isUnread ? 'unread' : 'read'}" data-notification-id="${notif.id}">
                    <div class="notification-content" data-clickable="true">
                        <div class="notification-title">${escapeHtml(notif.title)}</div>
                        <div class="notification-message">${escapeHtml(notif.message)}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                    ${isUnread ? '<div class="notification-unread-indicator"></div>' : ''}
                    <button class="notification-delete-btn" data-notification-id="${notif.id}" aria-label="Delete notification">×</button>
                </div>
            `;
        }).join('');

        // Add click handlers for notification items (to navigate/mark as read)
        listContainer.querySelectorAll('.notification-item').forEach(item => {
            const content = item.querySelector('.notification-content[data-clickable="true"]');
            if (content) {
                content.addEventListener('click', function(e) {
                    // Don't trigger if clicking delete button
                    if (e.target.closest('.notification-delete-btn')) {
                        return;
                    }
                    const notificationId = parseInt(item.dataset.notificationId);
                    handleNotificationClick(notificationId, item);
                });
            }
        });

        // Add click handlers for delete buttons
        listContainer.querySelectorAll('.notification-delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const notificationId = parseInt(this.dataset.notificationId);
                handleDeleteNotification(notificationId, this.closest('.notification-item'));
            });
        });
    }

    /**
     * Handle notification click
     */
    async function handleNotificationClick(notificationId, itemElement) {
        try {
            // Find notification
            const notification = notifications.find(n => n.id == notificationId);
            if (!notification) return;

            // Mark as read (update UI without reloading)
            const wasRead = await markAsRead(notificationId);
            if (wasRead && itemElement) {
                // Update UI to show read state
                itemElement.classList.remove('unread');
                itemElement.classList.add('read');
                const unreadIndicator = itemElement.querySelector('.notification-unread-indicator');
                if (unreadIndicator) {
                    unreadIndicator.remove();
                }
                // Update notification in array
                const notifIndex = notifications.findIndex(n => n.id == notificationId);
                if (notifIndex !== -1) {
                    notifications[notifIndex].is_read = 1;
                    notifications[notifIndex].read_at = new Date().toISOString();
                }
                // Update badge count (count unread from array)
                const unreadCount = notifications.filter(n => n.is_read == 0).length;
                updateNotificationCount(unreadCount);
            }

            // Navigate based on related_id (all booking notifications go to view-details via booking_id)
            if (notification.related_id) {
                await navigateToBookingDetails(notification.related_id);
            }
        } catch (error) {
            console.error('[NOTIFICATIONS] Error handling notification click:', error);
        }
    }

    /**
     * Handle delete notification
     */
    async function handleDeleteNotification(notificationId, itemElement) {
        try {
            const token =
                localStorage.getItem('auth_token') ||
                localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('backend/api/delete-notification.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    notification_id: notificationId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }

            const data = await response.json();
            if (data.success) {
                // Remove from array
                notifications = notifications.filter(n => n.id != notificationId);
                
                // Remove from DOM
                if (itemElement) {
                    itemElement.style.transition = 'opacity 0.3s ease';
                    itemElement.style.opacity = '0';
                    setTimeout(() => {
                        itemElement.remove();
                        // If no notifications left, show placeholder
                        if (notifications.length === 0) {
                            renderPlaceholder('You have no notifications yet.');
                        }
                    }, 300);
                }
                
                // Reload to update count badge
                loadNotifications();
            }
        } catch (error) {
            console.error('[NOTIFICATIONS] Error deleting notification:', error);
            alert('Failed to delete notification. Please try again.');
        }
    }

    /**
     * Mark notification as read
     */
    async function markAsRead(notificationId) {
        try {
            const token =
                localStorage.getItem('auth_token') ||
                localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('backend/api/mark-notification-read.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    notification_id: notificationId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('[NOTIFICATIONS] Error marking as read:', error);
            return false;
        }
    }

    /**
     * Navigate to booking details page
     */
    async function navigateToBookingDetails(bookingId) {
        try {
            // Get booking details to find listing type and ID
            const response = await fetch(`backend/api/get-booking.php?booking_id=${bookingId}`);
            const data = await response.json();

            if (data.success && data.data) {
                const booking = data.data;
                window.location.href = `view-details.html?type=${booking.listing_type}&id=${booking.listing_id}`;
            }
        } catch (error) {
            console.error('[NOTIFICATIONS] Error getting booking details:', error);
        }
    }

    /**
     * Start polling for new notifications
     */
    function startPolling() {
        // Poll every 30 seconds
        notificationPollInterval = setInterval(() => {
            if (window.Auth && window.Auth.isAuthenticated()) {
                loadNotifications();
            } else {
                stopPolling();
            }
        }, 30000);
    }

    /**
     * Stop polling
     */
    function stopPolling() {
        if (notificationPollInterval) {
            clearInterval(notificationPollInterval);
            notificationPollInterval = null;
        }
    }

    /**
     * Get time ago string
     */
    function getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showNotificationsButton() {
        const container = document.getElementById('notifications-container');
        if (container) {
            container.style.display = 'flex';
            container.classList.add('visible');
        }
    }

    function handleNotificationsButtonClick(e) {
        e.stopPropagation();

        if (!window.Auth || !window.Auth.isAuthenticated()) {
            renderGuestPrompt();
            openDropdown({ skipLoad: true });
            return;
        }

        toggleDropdown();
    }

    function renderPlaceholder(message, type = 'empty') {
        const listContainer = document.getElementById('notifications-list');
        if (!listContainer) return;

        let className = 'notifications-empty';
        if (type === 'loading') className = 'notifications-loading';
        if (type === 'error') className = 'notifications-empty';

        listContainer.innerHTML = `<div class="${className}">${message}</div>`;
    }

    function renderGuestPrompt() {
        const listContainer = document.getElementById('notifications-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div class="notifications-guest">
                <p>Sign in to view your notifications.</p>
                <button id="notifications-signin">Sign In</button>
            </div>
        `;

        const guestBtn = document.getElementById('notifications-signin');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-initialize on auth state change
    document.addEventListener('authStateChanged', function() {
        stopPolling();
        setTimeout(init, 100);
    });

    // Export to window
    window.Notifications = {
        loadNotifications,
        stopPolling
    };
})();


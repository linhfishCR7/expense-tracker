// Notification Manager - Handles user notifications and storage mode communications
class NotificationManager {
    constructor() {
        this.activeNotifications = new Set();
        this.createNotificationContainer();
        this.createStorageBanner();
        
        console.log('🔔 Notification Manager initialized');
    }

    // Create notification container
    createNotificationContainer() {
        if (document.getElementById('notification-container')) return;
        
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Create storage mode banner
    createStorageBanner() {
        if (document.getElementById('storage-banner')) return;
        
        const banner = document.createElement('div');
        banner.id = 'storage-banner';
        banner.className = 'storage-banner';
        document.body.appendChild(banner);
        
        this.updateStorageBanner();
    }

    // Update storage banner based on current mode
    updateStorageBanner() {
        const banner = document.getElementById('storage-banner');
        if (!banner) return;

        const storageInfo = window.storageManager.getStorageInfo();
        const connectionStatus = window.cloudStorage ? window.cloudStorage.getConnectionStatus() : { online: true };
        
        if (storageInfo.isSession) {
            banner.innerHTML = `
                <div class="storage-banner-content session-mode">
                    <div class="storage-info">
                        <span class="storage-icon">⚠️</span>
                        <span class="storage-text">Session Mode: Your data will be lost when you close the browser</span>
                    </div>
                    <button class="storage-upgrade-btn" onclick="notificationManager.showStorageChoiceModal()">
                        Enable Data Sync
                    </button>
                </div>
            `;
            banner.className = 'storage-banner session-mode visible';
        } else if (storageInfo.isPersistent) {
            const statusIcon = connectionStatus.online ? '☁️' : '📱';
            const statusText = connectionStatus.online ?
                'Cloud Sync: Your data is saved and synced across devices' :
                'Offline: Changes will sync when connection restored';

            banner.innerHTML = `
                <div class="storage-banner-content persistent-mode">
                    <div class="storage-info">
                        <span class="storage-icon">${statusIcon}</span>
                        <span class="storage-text">${statusText}</span>
                        ${storageInfo.userName ? `<span class="user-name">(${storageInfo.userName})</span>` : ''}
                    </div>
                    <button class="storage-settings-btn" onclick="notificationManager.showStorageSettings().catch(console.error)">
                        Settings
                    </button>
                </div>
            `;
            banner.className = `storage-banner persistent-mode ${connectionStatus.online ? 'online' : 'offline'} visible`;
        }
    }

    // Show storage choice modal for first-time users
    showStorageChoiceModal() {
        const modal = this.createModal('storage-choice-modal', 'Choose Your Storage Option');
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2>💾 Choose Your Storage Option</h2>
                <p>How would you like to store your expense data?</p>
            </div>
            <div class="modal-content">
                <div class="storage-options">
                    <div class="storage-option session-option" onclick="notificationManager.selectStorageMode('session')">
                        <div class="option-icon">📱</div>
                        <h3>Session Only</h3>
                        <p>Quick start, no login required</p>
                        <ul>
                            <li>✅ Start using immediately</li>
                            <li>✅ No account needed</li>
                            <li>⚠️ Data lost when browser closes</li>
                            <li>⚠️ No sync across devices</li>
                        </ul>
                        <button class="select-option-btn">Use Session Mode</button>
                    </div>
                    
                    <div class="storage-option persistent-option" onclick="notificationManager.selectStorageMode('persistent')">
                        <div class="option-icon">☁️</div>
                        <h3>Cloud Sync</h3>
                        <p>Sign in with Google for data sync</p>
                        <ul>
                            <li>✅ Data saved permanently</li>
                            <li>✅ Sync across all devices</li>
                            <li>✅ Access from anywhere</li>
                            <li>ℹ️ Requires Google sign-in</li>
                        </ul>
                        <button class="select-option-btn primary">Sign In & Sync</button>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <p class="note">💡 You can change this setting anytime in the app settings</p>
                </div>
            </div>
        `;
        
        this.showModal(modal);
    }

    // Show storage upgrade notification
    showStorageUpgradeNotification() {
        const notification = this.createNotification('storage-upgrade', 'info', 0); // Persistent notification
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">☁️</div>
                <div class="notification-text">
                    <strong>Upgrade to Cloud Sync!</strong>
                    <p>You're signed in! Enable cloud sync to save your data across all devices.</p>
                </div>
                <div class="notification-actions">
                    <button class="btn-primary" onclick="notificationManager.upgradeToCloudSync()">Enable Sync</button>
                    <button class="btn-secondary" onclick="notificationManager.dismissNotification('storage-upgrade')">Later</button>
                </div>
            </div>
        `;
        
        this.showNotification(notification);
    }

    // Show storage settings modal
    async showStorageSettings() {
        const storageInfo = window.storageManager.getStorageInfo();
        const dataSummary = await window.storageManager.getDataSummary();
        
        const modal = this.createModal('storage-settings-modal', 'Storage Settings');
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2>⚙️ Storage Settings</h2>
            </div>
            <div class="modal-content">
                <div class="current-storage-info">
                    <h3>Current Storage Mode</h3>
                    <div class="storage-status ${storageInfo.mode}-mode">
                        <span class="status-icon">${storageInfo.isSession ? '📱' : '☁️'}</span>
                        <span class="status-text">
                            ${storageInfo.isSession ? 'Session Only' : 'Cloud Sync'}
                            ${storageInfo.userName ? ` (${storageInfo.userName})` : ''}
                        </span>
                    </div>
                </div>
                
                <div class="data-summary">
                    <h3>Your Data</h3>
                    <div class="data-stats">
                        <div class="stat">
                            <span class="stat-label">Expenses:</span>
                            <span class="stat-value">${dataSummary.expenseCount}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Total Spent:</span>
                            <span class="stat-value">$${dataSummary.totalSpent.toFixed(2)}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Budget:</span>
                            <span class="stat-value">$${dataSummary.budget.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="storage-actions">
                    ${storageInfo.isSession ? `
                        <button class="btn-primary" onclick="notificationManager.upgradeToCloudSync()">
                            ☁️ Upgrade to Cloud Sync
                        </button>
                        <p class="action-note">Sign in with Google to sync your data across devices</p>
                    ` : `
                        <button class="btn-secondary" onclick="notificationManager.switchToSessionMode()">
                            📱 Switch to Session Mode
                        </button>
                        <p class="action-note">⚠️ Your data will only be stored locally</p>

                        <button class="btn-secondary" onclick="notificationManager.signOutOnly()">
                            🚪 Sign Out
                        </button>
                        <p class="action-note">ℹ️ Your data will remain in the cloud</p>

                        <button class="btn-danger" onclick="notificationManager.clearAllDataPermanently()">
                            🗑️ Clear All Data
                        </button>
                        <p class="action-note">⚠️ This will permanently delete all your expense data from the cloud</p>
                    `}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="notificationManager.closeModal('storage-settings-modal')">Close</button>
            </div>
        `;
        
        this.showModal(modal);
    }

    // Select storage mode
    async selectStorageMode(mode) {
        if (mode === 'persistent') {
            // Trigger Google sign-in
            if (window.authManager) {
                await window.authManager.signInWithGoogle();
            }
        } else {
            // Set session mode
            window.storageManager.setStorageMode('session');
            this.updateStorageBanner();
            this.closeModal('storage-choice-modal');
            
            this.showNotification(this.createNotification('session-selected', 'success', 3000, 
                '📱 Session mode selected. Your data will be stored temporarily.'));
        }
    }

    // Upgrade to cloud sync
    async upgradeToCloudSync() {
        if (window.authManager && window.authManager.isAuthenticated()) {
            // User is already signed in, just migrate data
            const migrationResult = await window.storageManager.migrateToPersonal(window.authManager.getCurrentUser());
            
            if (migrationResult) {
                this.showNotification(this.createNotification('migration-success', 'success', 5000,
                    `☁️ Upgraded to cloud sync! Migrated ${migrationResult.expenses} expenses.`));
            } else {
                this.showNotification(this.createNotification('sync-enabled', 'success', 3000,
                    '☁️ Cloud sync enabled! Your data will now be saved across devices.'));
            }
            
            this.updateStorageBanner();
            this.closeAllModals();
            this.dismissNotification('storage-upgrade');
        } else {
            // Trigger Google sign-in
            if (window.authManager) {
                await window.authManager.signInWithGoogle();
            }
        }
    }

    // Switch to session mode
    switchToSessionMode() {
        this.showConfirmationDialog(
            'Switch to Session Mode?',
            '⚠️ Your data will only be stored locally and may be lost when you close the browser. Are you sure?',
            () => {
                window.storageManager.setStorageMode('session');
                this.updateStorageBanner();
                this.closeAllModals();
                
                this.showNotification(this.createNotification('session-mode', 'info', 3000,
                    '📱 Switched to session mode. Data will be stored temporarily.'));
            }
        );
    }

    // Sign out only (keep data in cloud)
    signOutOnly() {
        this.showConfirmationDialog(
            'Sign Out?',
            'ℹ️ You will be signed out, but your data will remain safely stored in the cloud. You can sign back in anytime to access it.',
            async () => {
                if (window.authManager) {
                    await window.authManager.signOut();
                }

                this.closeAllModals();

                this.showNotification(this.createNotification('signed-out', 'info', 3000,
                    '🚪 Signed out successfully. Your data is safe in the cloud.'));
            }
        );
    }

    // Clear all data permanently
    clearAllDataPermanently() {
        this.showConfirmationDialog(
            'Permanently Delete All Data?',
            '⚠️ This will permanently delete ALL your expense data from the cloud. This action cannot be undone! Are you absolutely sure?',
            async () => {
                // Clear from cloud storage
                if (window.cloudStorage && window.cloudStorage.isAvailable()) {
                    await window.cloudStorage.clearUserData();
                }

                // Clear local storage
                if (window.storageManager) {
                    window.storageManager.clearAllData();
                }

                // Sign out
                if (window.authManager) {
                    await window.authManager.signOut();
                }

                this.closeAllModals();

                this.showNotification(this.createNotification('data-cleared', 'info', 5000,
                    '🗑️ All data permanently deleted from cloud and local storage.'));
            }
        );
    }

    // Create notification element
    createNotification(id, type, duration, message) {
        const notification = document.createElement('div');
        notification.id = `notification-${id}`;
        notification.className = `notification ${type}`;
        
        if (typeof message === 'string') {
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-message">${message}</span>
                    <button class="notification-close" onclick="notificationManager.dismissNotification('${id}')">×</button>
                </div>
            `;
        }
        
        if (duration > 0) {
            setTimeout(() => this.dismissNotification(id), duration);
        }
        
        return notification;
    }

    // Show notification
    showNotification(notification) {
        const container = document.getElementById('notification-container');
        if (container) {
            container.appendChild(notification);
            
            // Animate in
            setTimeout(() => notification.classList.add('show'), 100);
        }
    }

    // Dismiss notification
    dismissNotification(id) {
        const notification = document.getElementById(`notification-${id}`);
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    // Create modal
    createModal(id, title) {
        // Remove existing modal
        this.closeModal(id);
        
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modal.appendChild(modalContent);
        
        return modalContent;
    }

    // Show modal
    showModal(modal) {
        document.body.appendChild(modal.parentNode);
        setTimeout(() => modal.parentNode.classList.add('show'), 100);
    }

    // Close modal
    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // Close all modals
    closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        });
    }

    // Show confirmation dialog
    showConfirmationDialog(title, message, onConfirm) {
        const modal = this.createModal('confirmation-modal', title);
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2>${title}</h2>
            </div>
            <div class="modal-content">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="notificationManager.closeModal('confirmation-modal')">Cancel</button>
                <button class="btn-danger" onclick="notificationManager.confirmAction()">Confirm</button>
            </div>
        `;
        
        this.pendingConfirmAction = onConfirm;
        this.showModal(modal);
    }

    // Confirm action
    confirmAction() {
        if (this.pendingConfirmAction) {
            this.pendingConfirmAction();
            this.pendingConfirmAction = null;
        }
        this.closeModal('confirmation-modal');
    }
}

// Initialize notification manager
window.notificationManager = new NotificationManager();

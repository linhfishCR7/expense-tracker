// Storage Manager - Handles dual storage system (session vs persistent)
class StorageManager {
    constructor() {
        this.storageMode = this.getStorageMode();
        this.currentUser = null;
        this.listeners = [];
        
        // Initialize storage mode
        this.initializeStorageMode();
        
        console.log('💾 Storage Manager initialized with mode:', this.storageMode);
    }

    // Get current storage mode from localStorage
    getStorageMode() {
        return localStorage.getItem('storage_mode') || 'session';
    }

    // Set storage mode and notify listeners
    setStorageMode(mode) {
        const oldMode = this.storageMode;
        this.storageMode = mode;
        localStorage.setItem('storage_mode', mode);
        
        console.log(`💾 Storage mode changed: ${oldMode} → ${mode}`);
        
        // Notify all listeners
        this.listeners.forEach(callback => callback(mode, oldMode));
    }

    // Initialize storage mode based on current state
    initializeStorageMode() {
        // If user is already authenticated, use persistent mode
        if (window.authManager && window.authManager.isAuthenticated()) {
            this.storageMode = 'persistent';
            localStorage.setItem('storage_mode', 'persistent');
        }
    }

    // Add listener for storage mode changes
    onStorageModeChange(callback) {
        this.listeners.push(callback);
    }

    // Set current user (for persistent storage)
    setCurrentUser(user) {
        this.currentUser = user;
        if (user && this.storageMode === 'session') {
            // User signed in, suggest upgrading to persistent storage
            this.suggestPersistentStorage();
        }
    }

    // Get storage key based on mode
    getStorageKey(baseKey) {
        if (this.storageMode === 'persistent' && this.currentUser) {
            return `${baseKey}_${this.currentUser.uid}`;
        }
        return `${baseKey}_session`;
    }

    // Save data based on current storage mode
    async saveData(key, data) {
        const storageKey = this.getStorageKey(key);

        if (this.storageMode === 'session') {
            // Use sessionStorage for temporary data
            sessionStorage.setItem(storageKey, JSON.stringify(data));
            localStorage.setItem(storageKey, JSON.stringify(data)); // Backup in localStorage
            console.log(`💾 Data saved to session storage:`, key);
        } else {
            // Use cloud storage for persistent data
            if (window.cloudStorage && window.cloudStorage.isAvailable()) {
                try {
                    if (key === 'expenses') {
                        await window.cloudStorage.saveExpenses(data);
                    } else if (key === 'budget') {
                        await window.cloudStorage.saveBudget(data);
                    }
                    console.log(`☁️ Data saved to cloud (${this.storageMode} mode):`, key);
                } catch (error) {
                    console.error('❌ Cloud save failed, falling back to localStorage:', error);
                    localStorage.setItem(storageKey, JSON.stringify(data));
                }
            } else {
                // Fallback to localStorage if cloud not available
                localStorage.setItem(storageKey, JSON.stringify(data));
                console.log(`💾 Data saved to localStorage (cloud unavailable):`, key);
            }
        }
    }

    // Load data based on current storage mode
    async loadData(key, defaultValue = null) {
        const storageKey = this.getStorageKey(key);

        if (this.storageMode === 'session') {
            // Try sessionStorage first, then localStorage as backup
            const data = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
            if (data) {
                try {
                    return JSON.parse(data);
                } catch (error) {
                    console.error('Error parsing session data:', error);
                    return defaultValue;
                }
            }
            return defaultValue;
        } else {
            // Use cloud storage for persistent data
            if (window.cloudStorage && window.cloudStorage.isAvailable()) {
                try {
                    const cloudData = await window.cloudStorage.loadUserData();
                    if (key === 'expenses') {
                        return cloudData.expenses || defaultValue;
                    } else if (key === 'budget') {
                        return cloudData.budget || defaultValue;
                    }
                } catch (error) {
                    console.error('❌ Cloud load failed, falling back to localStorage:', error);
                }
            }

            // Fallback to localStorage if cloud not available
            const data = localStorage.getItem(storageKey);
            if (data) {
                try {
                    return JSON.parse(data);
                } catch (error) {
                    console.error('Error parsing localStorage data:', error);
                    return defaultValue;
                }
            }
            return defaultValue;
        }
    }

    // Migrate data from session to persistent storage
    async migrateToPersonal(user) {
        console.log('🔄 Migrating data from session to persistent storage...');

        const sessionExpenses = this.loadSessionData('expenses');
        const sessionBudget = this.loadSessionData('budget');

        if (sessionExpenses && sessionExpenses.length > 0) {
            // Set user and mode first
            this.currentUser = user;
            this.setStorageMode('persistent');

            // Set user in cloud storage
            if (window.cloudStorage) {
                window.cloudStorage.setCurrentUser(user);

                // Use cloud storage migration method
                const migrationSuccess = await window.cloudStorage.migrateLocalToCloud(
                    sessionExpenses,
                    sessionBudget || 0
                );

                if (migrationSuccess) {
                    // Clear session data after successful migration
                    this.clearSessionData();
                    console.log(`✅ Migrated ${sessionExpenses.length} expenses to cloud storage`);
                    return { expenses: sessionExpenses.length, budget: sessionBudget || 0 };
                } else {
                    console.error('❌ Cloud migration failed, keeping session data');
                    return null;
                }
            } else {
                // Fallback to localStorage migration
                await this.saveData('expenses', sessionExpenses);
                await this.saveData('budget', sessionBudget || 0);
                this.clearSessionData();
                console.log(`✅ Migrated ${sessionExpenses.length} expenses to localStorage`);
                return { expenses: sessionExpenses.length, budget: sessionBudget || 0 };
            }
        }

        return null;
    }

    // Load session data specifically
    loadSessionData(key) {
        const sessionKey = `${key}_session`;
        const sessionData = sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey);
        
        if (sessionData) {
            try {
                return JSON.parse(sessionData);
            } catch (error) {
                console.error('Error parsing session data:', error);
                return null;
            }
        }
        
        return null;
    }

    // Clear session data
    clearSessionData() {
        const keysToRemove = ['expenses_session', 'budget_session'];
        
        keysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
        
        console.log('🗑️ Session data cleared');
    }

    // Clear all user data
    clearAllData() {
        if (this.currentUser) {
            const userKeys = [`expenses_${this.currentUser.uid}`, `budget_${this.currentUser.uid}`];
            userKeys.forEach(key => localStorage.removeItem(key));
        }
        
        this.clearSessionData();
        console.log('🗑️ All user data cleared');
    }

    // Get storage mode info for UI
    getStorageInfo() {
        return {
            mode: this.storageMode,
            isSession: this.storageMode === 'session',
            isPersistent: this.storageMode === 'persistent',
            hasUser: !!this.currentUser,
            userName: this.currentUser?.displayName || null
        };
    }

    // Suggest upgrading to persistent storage
    suggestPersistentStorage() {
        if (window.notificationManager) {
            window.notificationManager.showStorageUpgradeNotification();
        }
    }

    // Check if session data exists
    hasSessionData() {
        const expenses = this.loadSessionData('expenses');
        return expenses && expenses.length > 0;
    }

    // Get data summary for migration confirmation
    getDataSummary() {
        const expenses = this.loadData('expenses', []);
        const budget = this.loadData('budget', 0);
        
        return {
            expenseCount: expenses.length,
            totalSpent: expenses.reduce((sum, expense) => sum + expense.amount, 0),
            budget: budget,
            hasData: expenses.length > 0 || budget > 0
        };
    }
}

// Initialize storage manager
window.storageManager = new StorageManager();

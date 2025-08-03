// Cloud Storage Manager - Real Firebase Firestore integration for cross-device sync
class CloudStorageManager {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.isOnline = navigator.onLine;
        this.pendingWrites = [];
        this.listeners = [];
        
        // Initialize when Firebase is ready
        this.initializeWhenReady();
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnlineStatusChange(true));
        window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
        
        console.log('☁️ Cloud Storage Manager initialized');
    }

    async initializeWhenReady() {
        // Wait for Firebase to be ready
        const checkFirebase = () => {
            if (window.firebaseDb && window.firebaseConfigured) {
                this.db = window.firebaseDb;
                console.log('✅ Cloud Storage connected to Firestore');
                this.processPendingWrites();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    }

    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            console.log('👤 Cloud Storage: User set to', user.displayName);
            // Set up real-time listeners for this user's data
            this.setupRealtimeListeners();
        } else {
            console.log('👤 Cloud Storage: User cleared');
            this.removeRealtimeListeners();
        }
    }

    // Get user's document reference
    getUserDocRef() {
        if (!this.db || !this.currentUser) return null;
        return this.db.collection('users').doc(this.currentUser.uid);
    }

    // Save expenses to Firestore
    async saveExpenses(expenses) {
        console.log('☁️ Attempting to save expenses to cloud:', {
            expenseCount: expenses.length,
            hasUser: !!this.currentUser,
            hasDb: !!this.db,
            userId: this.currentUser?.uid,
            isOnline: this.isOnline
        });

        if (!this.currentUser || !this.db) {
            console.warn('⚠️ Cannot save to cloud: No user or database connection');
            return false;
        }

        try {
            const userDoc = this.getUserDocRef();
            const docData = {
                expenses: expenses,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                userInfo: {
                    name: this.currentUser.displayName,
                    email: this.currentUser.email,
                    photoURL: this.currentUser.photoURL
                }
            };

            console.log('📤 Writing to Firestore document:', this.currentUser.uid, docData);
            await userDoc.set(docData, { merge: true });

            console.log(`✅ Successfully saved ${expenses.length} expenses to cloud`);
            return true;
        } catch (error) {
            // Handle specific Firebase errors
            if (error.code === 'unavailable' || error.message.includes('offline') || !this.isOnline) {
                console.warn('⚠️ Cloud unavailable, queuing expenses for later sync');
                this.pendingWrites.push({ type: 'expenses', data: expenses });

                // Save to localStorage as backup
                this.saveToLocalBackup('expenses', expenses);
                return true; // Return true since we've handled it gracefully
            } else if (error.code === 'permission-denied') {
                console.error('🚫 Firestore permission denied - Database may not be set up properly');
                console.error('💡 Please check FIRESTORE_SETUP_GUIDE.md for setup instructions');
                this.showFirestoreSetupError();
                this.saveToLocalBackup('expenses', expenses);
                return false;
            } else if (error.code === 'not-found') {
                console.error('🔍 Firestore database not found - Database may not be created');
                console.error('💡 Please create Firestore database in Firebase Console');
                this.showFirestoreSetupError();
                this.saveToLocalBackup('expenses', expenses);
                return false;
            } else {
                console.error('❌ Error saving expenses to cloud:', error);
                this.saveToLocalBackup('expenses', expenses);
                return false;
            }
        }
    }

    // Save budget to Firestore
    async saveBudget(budget) {
        if (!this.currentUser || !this.db) {
            console.warn('⚠️ Cannot save budget to cloud: No user or database connection');
            return false;
        }

        try {
            const userDoc = this.getUserDocRef();
            await userDoc.set({
                budget: budget,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`☁️ Saved budget $${budget} to cloud`);
            return true;
        } catch (error) {
            // Handle specific Firebase errors
            if (error.code === 'unavailable' || error.message.includes('offline') || !this.isOnline) {
                console.warn('⚠️ Cloud unavailable, queuing budget for later sync');
                this.pendingWrites.push({ type: 'budget', data: budget });

                // Save to localStorage as backup
                this.saveToLocalBackup('budget', budget);
                return true; // Return true since we've handled it gracefully
            } else {
                console.error('❌ Error saving budget to cloud:', error);
                this.saveToLocalBackup('budget', budget);
                return false;
            }
        }
    }

    // Load user data from Firestore
    async loadUserData() {
        if (!this.currentUser || !this.db) {
            console.warn('⚠️ Cannot load from cloud: No user or database connection');
            return { expenses: [], budget: 0 };
        }

        try {
            const userDoc = this.getUserDocRef();
            const doc = await userDoc.get();

            if (doc.exists) {
                const data = doc.data();
                console.log(`☁️ Loaded ${data.expenses?.length || 0} expenses and budget $${data.budget || 0} from cloud`);

                return {
                    expenses: Array.isArray(data.expenses) ? data.expenses : [],
                    budget: typeof data.budget === 'number' ? data.budget : 0,
                    lastUpdated: data.lastUpdated
                };
            } else {
                console.log('📄 No cloud data found for user, starting fresh');
                return { expenses: [], budget: 0 };
            }
        } catch (error) {
            // Handle specific Firebase errors
            if (error.code === 'unavailable' || error.message.includes('offline')) {
                console.warn('⚠️ Cloud storage offline, using local fallback');
                return this.loadFromLocalFallback();
            } else if (error.code === 'permission-denied') {
                console.error('❌ Permission denied accessing cloud data');
                return { expenses: [], budget: 0 };
            } else {
                console.error('❌ Error loading data from cloud:', error);
                return this.loadFromLocalFallback();
            }
        }
    }

    // Fallback to localStorage when cloud is unavailable
    loadFromLocalFallback() {
        try {
            if (this.currentUser) {
                const userId = this.currentUser.uid;
                const expenses = JSON.parse(localStorage.getItem(`expenses_${userId}`)) || [];
                const budget = parseFloat(localStorage.getItem(`budget_${userId}`)) || 0;

                console.log('📱 Loaded from localStorage fallback');
                return { expenses, budget };
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage fallback:', error);
        }

        return { expenses: [], budget: 0 };
    }

    // Set up real-time listeners for data changes
    setupRealtimeListeners() {
        if (!this.currentUser || !this.db) return;

        // Remove existing listeners
        this.removeRealtimeListeners();

        const userDoc = this.getUserDocRef();
        
        // Listen for real-time updates
        this.unsubscribe = userDoc.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                console.log('🔄 Real-time update received from cloud');

                // Notify listeners about the update
                this.listeners.forEach(callback => {
                    try {
                        callback({
                            expenses: Array.isArray(data.expenses) ? data.expenses : [],
                            budget: typeof data.budget === 'number' ? data.budget : 0,
                            lastUpdated: data.lastUpdated
                        });
                    } catch (error) {
                        console.error('❌ Error in real-time listener callback:', error);
                    }
                });
            }
        }, (error) => {
            // Handle specific listener errors
            if (error.code === 'unavailable' || error.message.includes('offline')) {
                console.warn('⚠️ Real-time listener offline, will reconnect when online');
            } else if (error.code === 'permission-denied') {
                console.error('❌ Permission denied for real-time updates');
            } else {
                console.error('❌ Real-time listener error:', error);
            }

            this.lastError = error;
        });
    }

    // Remove real-time listeners
    removeRealtimeListeners() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log('🔇 Real-time listeners removed');
        }
    }

    // Add listener for real-time updates
    onDataUpdate(callback) {
        this.listeners.push(callback);
    }

    // Remove listener
    removeDataUpdateListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    // Handle online/offline status changes
    handleOnlineStatusChange(isOnline) {
        this.isOnline = isOnline;
        console.log(`🌐 Connection status: ${isOnline ? 'Online' : 'Offline'}`);
        
        if (isOnline) {
            this.processPendingWrites();
        }
    }

    // Process pending writes when coming back online
    async processPendingWrites() {
        if (this.pendingWrites.length === 0) return;
        
        console.log(`📤 Processing ${this.pendingWrites.length} pending writes...`);
        
        const writes = [...this.pendingWrites];
        this.pendingWrites = [];
        
        for (const write of writes) {
            try {
                if (write.type === 'expenses') {
                    await this.saveExpenses(write.data);
                } else if (write.type === 'budget') {
                    await this.saveBudget(write.data);
                }
            } catch (error) {
                console.error('❌ Error processing pending write:', error);
                // Re-queue if still failing
                this.pendingWrites.push(write);
            }
        }
    }

    // Clear all user data from cloud
    async clearUserData() {
        if (!this.currentUser || !this.db) {
            console.warn('⚠️ Cannot clear cloud data: No user or database connection');
            return false;
        }

        try {
            const userDoc = this.getUserDocRef();
            await userDoc.delete();
            console.log('🗑️ User data cleared from cloud');
            return true;
        } catch (error) {
            console.error('❌ Error clearing user data from cloud:', error);
            return false;
        }
    }

    // Check if cloud storage is available (works offline too due to Firestore offline support)
    isAvailable() {
        const available = !!(this.db && this.currentUser);
        console.log('🔍 Cloud storage availability check:', {
            hasDb: !!this.db,
            hasUser: !!this.currentUser,
            isOnline: this.isOnline,
            available: available
        });
        return available;
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isAvailable(),
            online: this.isOnline,
            hasUser: !!this.currentUser,
            hasDatabase: !!this.db,
            pendingWrites: this.pendingWrites.length
        };
    }

    // Migrate local data to cloud
    async migrateLocalToCloud(expenses, budget) {
        if (!this.isAvailable()) {
            console.warn('⚠️ Cannot migrate: Cloud storage not available');
            return false;
        }

        try {
            console.log('🔄 Migrating local data to cloud...');
            
            // Check if cloud data already exists
            const cloudData = await this.loadUserData();
            
            if (cloudData.expenses.length > 0) {
                // Merge local and cloud data, avoiding duplicates
                const mergedExpenses = this.mergeExpenses(expenses, cloudData.expenses);
                await this.saveExpenses(mergedExpenses);
                console.log(`✅ Merged and saved ${mergedExpenses.length} expenses to cloud`);
            } else {
                // No cloud data, just save local data
                await this.saveExpenses(expenses);
                console.log(`✅ Migrated ${expenses.length} expenses to cloud`);
            }
            
            // Save budget (use local if higher, or cloud if local is 0)
            const finalBudget = budget > 0 ? budget : cloudData.budget;
            await this.saveBudget(finalBudget);
            
            return true;
        } catch (error) {
            console.error('❌ Error migrating data to cloud:', error);
            return false;
        }
    }

    // Merge expenses avoiding duplicates
    mergeExpenses(localExpenses, cloudExpenses) {
        const merged = [...cloudExpenses];
        const existingIds = new Set(cloudExpenses.map(e => e.id));

        localExpenses.forEach(expense => {
            if (!existingIds.has(expense.id)) {
                merged.push(expense);
            }
        });

        // Sort by timestamp (newest first)
        return merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Save to localStorage as backup when cloud is unavailable
    saveToLocalBackup(key, data) {
        if (!this.currentUser) return;

        try {
            const userId = this.currentUser.uid;
            const storageKey = `${key}_${userId}`;
            localStorage.setItem(storageKey, JSON.stringify(data));
            console.log(`💾 Saved ${key} to localStorage backup`);
        } catch (error) {
            console.error('❌ Error saving to localStorage backup:', error);
        }
    }

    // Enhanced connection status with error handling
    getConnectionStatus() {
        return {
            online: this.isOnline,
            connected: this.isAvailable(),
            hasUser: !!this.currentUser,
            hasDatabase: !!this.db,
            pendingWrites: this.pendingWrites.length,
            lastError: this.lastError || null
        };
    }

    // Show Firestore setup error notification
    showFirestoreSetupError() {
        if (window.notificationManager && !this.setupErrorShown) {
            this.setupErrorShown = true;

            window.notificationManager.showNotification(
                window.notificationManager.createNotification('firestore-setup-error', 'error', 10000,
                    '🚫 Firestore Database Setup Required - Click for instructions')
            );

            // Show detailed setup modal after a delay
            setTimeout(() => {
                this.showFirestoreSetupModal();
            }, 2000);
        }
    }

    // Show Firestore setup instructions modal
    showFirestoreSetupModal() {
        if (!window.notificationManager) return;

        const modal = window.notificationManager.createModal('firestore-setup-modal', 'Firestore Database Setup Required');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🔥 Firestore Database Setup Required</h2>
                    <button class="modal-close" onclick="notificationManager.closeModal('firestore-setup-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="setup-error-info">
                        <p><strong>Issue:</strong> The Firestore database is not properly set up for cross-device sync.</p>

                        <h3>🚀 Quick Setup Steps:</h3>
                        <ol>
                            <li>Go to <a href="https://console.firebase.google.com/project/expense-tracker-12072" target="_blank">Firebase Console</a></li>
                            <li>Click "Firestore Database" → "Create database"</li>
                            <li>Choose "Start in test mode" → Select location → "Done"</li>
                            <li>Go to "Rules" tab and set secure rules</li>
                        </ol>

                        <h3>🧪 Test Your Setup:</h3>
                        <p>Use the <a href="test-firestore.html" target="_blank">Firestore Diagnostic Tool</a> to verify your setup.</p>

                        <h3>📖 Detailed Instructions:</h3>
                        <p>See <code>FIRESTORE_SETUP_GUIDE.md</code> for complete setup instructions.</p>

                        <div class="setup-status">
                            <p><strong>Current Status:</strong></p>
                            <ul>
                                <li>✅ Firebase Project: expense-tracker-12072</li>
                                <li>✅ Authentication: Working</li>
                                <li>❌ Firestore Database: Not accessible</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="window.open('https://console.firebase.google.com/project/expense-tracker-12072', '_blank')">
                        Open Firebase Console
                    </button>
                    <button class="btn-secondary" onclick="window.open('test-firestore.html', '_blank')">
                        Test Setup
                    </button>
                    <button class="btn-secondary" onclick="notificationManager.closeModal('firestore-setup-modal')">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }
}

// Initialize cloud storage manager
window.cloudStorage = new CloudStorageManager();

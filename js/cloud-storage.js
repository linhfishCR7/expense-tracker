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
        if (!this.currentUser || !this.db) {
            console.warn('⚠️ Cannot save to cloud: No user or database connection');
            return false;
        }

        try {
            const userDoc = this.getUserDocRef();
            await userDoc.set({
                expenses: expenses,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                userInfo: {
                    name: this.currentUser.displayName,
                    email: this.currentUser.email,
                    photoURL: this.currentUser.photoURL
                }
            }, { merge: true });

            console.log(`☁️ Saved ${expenses.length} expenses to cloud`);
            return true;
        } catch (error) {
            console.error('❌ Error saving expenses to cloud:', error);
            
            if (!this.isOnline) {
                // Queue for later when online
                this.pendingWrites.push({ type: 'expenses', data: expenses });
                console.log('📝 Queued expenses for sync when online');
            }
            return false;
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
            console.error('❌ Error saving budget to cloud:', error);
            
            if (!this.isOnline) {
                this.pendingWrites.push({ type: 'budget', data: budget });
                console.log('📝 Queued budget for sync when online');
            }
            return false;
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
                    expenses: data.expenses || [],
                    budget: data.budget || 0,
                    lastUpdated: data.lastUpdated
                };
            } else {
                console.log('📄 No cloud data found for user, starting fresh');
                return { expenses: [], budget: 0 };
            }
        } catch (error) {
            console.error('❌ Error loading data from cloud:', error);
            return { expenses: [], budget: 0 };
        }
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
                    callback({
                        expenses: data.expenses || [],
                        budget: data.budget || 0,
                        lastUpdated: data.lastUpdated
                    });
                });
            }
        }, (error) => {
            console.error('❌ Real-time listener error:', error);
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

    // Check if cloud storage is available
    isAvailable() {
        return !!(this.db && this.currentUser && this.isOnline);
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
}

// Initialize cloud storage manager
window.cloudStorage = new CloudStorageManager();

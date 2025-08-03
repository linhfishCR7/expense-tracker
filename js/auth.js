class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
        this.initializeAuth();
    }

    initializeAuth() {
        // Wait for Firebase to be ready
        if (typeof firebase === 'undefined' || typeof window.firebaseConfigured === 'undefined') {
            setTimeout(() => this.initializeAuth(), 100);
            return;
        }

        // Check if Firebase is properly configured
        if (!window.firebaseConfigured || window.demoMode) {
            console.warn('Firebase not configured, running in demo mode');
            this.setupDemoMode();
            return;
        }

        // Set up authentication state listener
        firebase.auth().onAuthStateChanged((user) => {
            this.currentUser = user;
            this.handleAuthStateChange(user);

            // Notify listeners
            this.authStateListeners.forEach(callback => callback(user));
        });

        // Set up event listeners
        this.setupEventListeners();
    }

    setupDemoMode() {
        // Create a demo user for testing
        const demoUser = {
            uid: 'demo-user-123',
            displayName: 'Demo User',
            email: 'demo@example.com',
            photoURL: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Mjg1RjQiLz4KPHRleHQgeD0iMjAiIHk9IjI2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgZm9udC1mYW1pbHk9IkFyaWFsIj5EPC90ZXh0Pgo8L3N2Zz4K'
        };

        // Show demo mode notification
        this.showDemoModeNotification();

        // Set up event listeners for demo mode
        this.setupEventListeners();

        // Simulate authentication after a short delay
        setTimeout(() => {
            this.currentUser = demoUser;
            this.handleAuthStateChange(demoUser);
            this.authStateListeners.forEach(callback => callback(demoUser));
        }, 1000);
    }

    showDemoModeNotification() {
        const authOverlay = document.getElementById('authOverlay');
        if (authOverlay) {
            authOverlay.innerHTML = `
                <div class="auth-container">
                    <div class="auth-header">
                        <h1>💰 Personal Expense Tracker</h1>
                        <p>Demo Mode - Firebase Setup Required</p>
                    </div>
                    <div class="auth-content">
                        <div class="demo-notice">
                            <h3>🚨 Setup Required</h3>
                            <p>To use Google Sign-in, please follow the setup guide in <code>FIREBASE_SETUP.md</code></p>
                            <p>For now, you can try the demo mode:</p>
                            <button id="demoSignInBtn" class="google-signin-btn">
                                <span>🎭</span>
                                Continue with Demo Mode
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Set up demo sign-in button
            const demoBtn = document.getElementById('demoSignInBtn');
            if (demoBtn) {
                demoBtn.addEventListener('click', () => {
                    this.hideAuthOverlay();
                });
            }
        }
    }

    setupEventListeners() {
        // Google Sign In button
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', () => this.signInWithGoogle());
        }

        // Sign Out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.signOut());
        }
    }

    async signInWithGoogle() {
        try {
            this.showLoading(true);
            this.hideError();

            const result = await firebase.auth().signInWithPopup(window.googleProvider);
            const user = result.user;

            console.log('Sign-in successful:', user.displayName);

            // Close any open modals
            if (window.notificationManager) {
                window.notificationManager.closeAllModals();
            }

            // Analytics/tracking (optional)
            this.trackAuthEvent('google_sign_in_success');

        } catch (error) {
            console.error('Sign-in error:', error);
            this.showError(this.getErrorMessage(error));
            this.trackAuthEvent('google_sign_in_error', { error: error.code });
        } finally {
            this.showLoading(false);
        }
    }

    async signOut() {
        try {
            await firebase.auth().signOut();
            console.log('Sign-out successful');
            this.trackAuthEvent('sign_out_success');
        } catch (error) {
            console.error('Sign-out error:', error);
            this.showError('Failed to sign out. Please try again.');
            this.trackAuthEvent('sign_out_error', { error: error.code });
        }
    }

    handleAuthStateChange(user) {
        if (user) {
            // User is signed in
            this.hideAuthOverlay();
            this.showUserProfile(user);

            // Update storage manager and switch to persistent mode
            if (window.storageManager) {
                window.storageManager.setStorageMode('persistent');
                window.storageManager.setCurrentUser(user);
            }

            // Update storage banner
            if (window.notificationManager) {
                window.notificationManager.updateStorageBanner();
            }

            console.log('User authenticated:', user.displayName);
        } else {
            // User is signed out - don't show auth overlay, allow session mode
            this.hideAuthOverlay();
            this.hideUserProfile();

            // Update storage manager for session mode
            if (window.storageManager) {
                window.storageManager.setStorageMode('session');
                window.storageManager.setCurrentUser(null);
            }

            // Update storage banner
            if (window.notificationManager) {
                window.notificationManager.updateStorageBanner();
            }

            console.log('User signed out - continuing in session mode');
        }
    }

    showUserProfile(user) {
        const userProfile = document.getElementById('userProfile');
        const userPhoto = document.getElementById('userPhoto');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');

        if (userProfile && userPhoto && userName && userEmail) {
            userPhoto.src = user.photoURL || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzIgMzJDMzIgMjYuNDc3MiAyNy41MjI4IDIyIDIyIDIySDEyQzYuNDc3MTUgMjIgMiAyNi40NzcyIDIgMzJWMzJIMzJWMzJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
            userName.textContent = user.displayName || 'User';
            userEmail.textContent = user.email || '';
            userProfile.style.display = 'flex';
        }
    }

    hideUserProfile() {
        const userProfile = document.getElementById('userProfile');
        if (userProfile) {
            userProfile.style.display = 'none';
        }
    }

    showAuthOverlay() {
        const authOverlay = document.getElementById('authOverlay');
        if (authOverlay) {
            authOverlay.style.display = 'flex';
        }
    }

    hideAuthOverlay() {
        const authOverlay = document.getElementById('authOverlay');
        if (authOverlay) {
            authOverlay.style.display = 'none';
        }
    }

    showLoading(show) {
        const loadingElement = document.getElementById('authLoading');
        const signInBtn = document.getElementById('googleSignInBtn');
        
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
        
        if (signInBtn) {
            signInBtn.disabled = show;
            signInBtn.style.opacity = show ? '0.6' : '1';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('authError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide error after 5 seconds
            setTimeout(() => this.hideError(), 5000);
        }
    }

    hideError() {
        const errorElement = document.getElementById('authError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                return 'Sign-in was cancelled. Please try again.';
            case 'auth/popup-blocked':
                return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection and try again.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/user-disabled':
                return 'This account has been disabled. Please contact support.';
            default:
                return 'Sign-in failed. Please try again.';
        }
    }

    trackAuthEvent(eventName, data = {}) {
        // Optional: Send analytics data to your preferred service
        console.log('Auth Event:', eventName, data);
        
        // Example: Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'authentication',
                ...data
            });
        }
    }

    // Public methods for other parts of the app
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        
        // If user is already loaded, call callback immediately
        if (this.currentUser !== null) {
            callback(this.currentUser);
        }
    }

    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    getUserName() {
        return this.currentUser ? this.currentUser.displayName : null;
    }

    getUserPhoto() {
        return this.currentUser ? this.currentUser.photoURL : null;
    }
}

// Initialize authentication manager
const authManager = new AuthManager();

// Export for use in other files
window.authManager = authManager;

const firebaseConfig = {
    apiKey: "AIzaSyBqLuNHjFQFPq6DHQLsyC9z_-VP6kP6Gkg",
    authDomain: "expense-tracker-12072.firebaseapp.com",
    projectId: "expense-tracker-12072",
    storageBucket: "expense-tracker-12072.firebasestorage.app",
    messagingSenderId: "442437594398",
    appId: "1:442437594398:web:bdae9cec72172f6929ed0f",
    measurementId: "G-TBLFEXRC4X"
};

// Environment detection
const isLocalhost = window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.includes('localhost');

const isGitHubPages = window.location.hostname.includes('github.io');

// Check if this is still the demo configuration
const isDemoConfig = firebaseConfig.apiKey.includes('Demo-Replace');

// Log environment info
console.log('🌍 Environment Detection:');
console.log('- Localhost:', isLocalhost);
console.log('- GitHub Pages:', isGitHubPages);
console.log('- Current URL:', window.location.href);

if (isDemoConfig) {
    console.warn('🚨 FIREBASE SETUP REQUIRED 🚨');
    console.warn('Please follow the setup guide in FIREBASE_SETUP.md to configure Firebase Authentication');
    console.warn('The current configuration is just a demo and will not work');
    console.warn('⚠️ Firebase API errors are EXPECTED in demo mode - this is normal!');
}

// Initialize Firebase with enhanced error handling
try {
    console.log('🔧 Initializing Firebase with project:', firebaseConfig.projectId);

    firebase.initializeApp(firebaseConfig);

    // Initialize Firebase Auth
    const auth = firebase.auth();

    // Test the connection with a simple operation
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ Firebase Auth: User signed in:', user.displayName);
        } else {
            console.log('ℹ️ Firebase Auth: No user signed in');
        }
    });

    // Configure Google Auth Provider
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    // Export for use in other files
    window.firebaseAuth = auth;
    window.googleProvider = googleProvider;
    window.firebaseConfigured = true;
    window.demoMode = false;

    console.log('✅ Firebase initialized successfully');
    console.log('🔑 API Key (first 10 chars):', firebaseConfig.apiKey.substring(0, 10) + '...');
    console.log('🏠 Auth Domain:', firebaseConfig.authDomain);

} catch (error) {
    console.error('❌ Firebase initialization failed:', error);

    // Provide specific error guidance
    if (error.message.includes('api-key-not-valid')) {
        console.error('🚨 FIREBASE API KEY ERROR:');
        console.error('1. Check if your Firebase project exists');
        console.error('2. Verify the API key in Firebase Console > Project Settings');
        console.error('3. Ensure Authentication is enabled in Firebase Console');
        console.error('4. Check if your domain is authorized');
    }

    console.warn('⚠️ Falling back to demo mode due to Firebase error');

    // Set demo mode flag
    window.firebaseConfigured = false;
    window.demoMode = true;
}

// Diagnostic function to help troubleshoot Firebase issues
window.diagnoseFirebase = function() {
    console.log('🔍 FIREBASE DIAGNOSTIC REPORT');
    console.log('================================');
    console.log('Project ID:', firebaseConfig.projectId);
    console.log('Auth Domain:', firebaseConfig.authDomain);
    console.log('API Key (first 10 chars):', firebaseConfig.apiKey.substring(0, 10) + '...');
    console.log('Firebase Configured:', window.firebaseConfigured);
    console.log('Demo Mode:', window.demoMode);
    console.log('Current URL:', window.location.href);
    console.log('================================');

    if (!window.firebaseConfigured) {
        console.log('🚨 TROUBLESHOOTING STEPS:');
        console.log('1. Go to https://console.firebase.google.com/');
        console.log('2. Select your project:', firebaseConfig.projectId);
        console.log('3. Go to Authentication > Sign-in method');
        console.log('4. Enable Google provider');
        console.log('5. Go to Project Settings > General');
        console.log('6. Verify your web app configuration');
        console.log('7. Check Authorized domains in Authentication > Settings');
    }
};

// Auto-run diagnostics if there are issues
if (window.demoMode && !isDemoConfig) {
    console.log('🔧 Running auto-diagnostics due to Firebase initialization failure...');
    setTimeout(() => window.diagnoseFirebase(), 1000);
}

// Production deployment verification
if (isGitHubPages && window.firebaseConfigured) {
    console.log('🚀 Production deployment detected and Firebase configured successfully!');
    console.log('🔒 Security: Firebase API keys are safe for client-side use');
    console.log('🌐 Domain:', window.location.hostname);
}

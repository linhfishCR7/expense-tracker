// Deployment Verification Script
// This script runs automatically to verify the deployment is working correctly

class DeploymentChecker {
    constructor() {
        this.checks = [];
        this.runChecks();
    }

    addCheck(name, testFunction, critical = false) {
        this.checks.push({ name, testFunction, critical });
    }

    async runChecks() {
        console.log('🔍 Running deployment verification checks...');
        console.log('================================================');

        let passedChecks = 0;
        let criticalFailures = 0;

        for (const check of this.checks) {
            try {
                const result = await check.testFunction();
                if (result) {
                    console.log(`✅ ${check.name}: PASSED`);
                    passedChecks++;
                } else {
                    console.log(`❌ ${check.name}: FAILED`);
                    if (check.critical) criticalFailures++;
                }
            } catch (error) {
                console.log(`❌ ${check.name}: ERROR - ${error.message}`);
                if (check.critical) criticalFailures++;
            }
        }

        console.log('================================================');
        console.log(`📊 Results: ${passedChecks}/${this.checks.length} checks passed`);

        if (criticalFailures > 0) {
            console.log('🚨 Critical failures detected! Check Firebase configuration.');
        } else if (passedChecks === this.checks.length) {
            console.log('🎉 All checks passed! Deployment is working correctly.');
        } else {
            console.log('⚠️ Some non-critical checks failed. App should still work.');
        }
    }

    // Check if Firebase is properly initialized
    checkFirebaseInit() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(typeof window.firebaseAuth !== 'undefined' && window.firebaseConfigured === true);
            }, 1000);
        });
    }

    // Check if the correct environment is detected
    checkEnvironmentDetection() {
        const isCorrectEnv = window.location.hostname.includes('github.io') ? 
            window.isGitHubPages : 
            (window.location.hostname === 'localhost' ? window.isLocalhost : true);
        return Promise.resolve(isCorrectEnv);
    }

    // Check if DOM elements are present
    checkDOMElements() {
        const requiredElements = [
            'expenseForm',
            'totalBudget',
            'totalSpent',
            'remaining',
            'expensesList'
        ];

        const allPresent = requiredElements.every(id => document.getElementById(id) !== null);
        return Promise.resolve(allPresent);
    }

    // Check if localStorage is working
    checkLocalStorage() {
        try {
            const testKey = 'deployment-test';
            localStorage.setItem(testKey, 'test-value');
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            return Promise.resolve(retrieved === 'test-value');
        } catch (error) {
            return Promise.resolve(false);
        }
    }

    // Check if CSS is loaded
    checkCSSLoaded() {
        const testElement = document.createElement('div');
        testElement.className = 'container';
        document.body.appendChild(testElement);
        
        const styles = window.getComputedStyle(testElement);
        const hasStyles = styles.maxWidth !== '' && styles.maxWidth !== 'none';
        
        document.body.removeChild(testElement);
        return Promise.resolve(hasStyles);
    }

    // Check if authentication manager is loaded
    checkAuthManager() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(typeof window.authManager !== 'undefined');
            }, 1500);
        });
    }
}

// Initialize deployment checker when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only run checks in production or when explicitly requested
    const shouldRunChecks = window.location.hostname.includes('github.io') || 
                           window.location.search.includes('check=true') ||
                           localStorage.getItem('runDeploymentChecks') === 'true';

    if (shouldRunChecks) {
        const checker = new DeploymentChecker();
        
        // Add all checks
        checker.addCheck('Firebase Initialization', () => checker.checkFirebaseInit(), true);
        checker.addCheck('Environment Detection', () => checker.checkEnvironmentDetection());
        checker.addCheck('DOM Elements Present', () => checker.checkDOMElements(), true);
        checker.addCheck('LocalStorage Working', () => checker.checkLocalStorage(), true);
        checker.addCheck('CSS Loaded', () => checker.checkCSSLoaded());
        checker.addCheck('Auth Manager Loaded', () => checker.checkAuthManager(), true);

        // Make checker globally available for manual testing
        window.deploymentChecker = checker;
    }
});

// Manual check function
window.runDeploymentCheck = function() {
    const checker = new DeploymentChecker();
    checker.addCheck('Firebase Initialization', () => checker.checkFirebaseInit(), true);
    checker.addCheck('Environment Detection', () => checker.checkEnvironmentDetection());
    checker.addCheck('DOM Elements Present', () => checker.checkDOMElements(), true);
    checker.addCheck('LocalStorage Working', () => checker.checkLocalStorage(), true);
    checker.addCheck('CSS Loaded', () => checker.checkCSSLoaded());
    checker.addCheck('Auth Manager Loaded', () => checker.checkAuthManager(), true);
};

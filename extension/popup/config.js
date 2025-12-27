// Smart Message Organizer - Configuration
// Phase 4: Backend Configuration

/**
 * Backend API Configuration
 * 
 * Development: http://localhost:8000
 * Production: Update to your production API URL
 */
const CONFIG = {
    // Backend API URL
    API_BASE_URL: 'http://13.49.175.203:8000',
    
    // API Settings
    API_TIMEOUT: 180000, // 120 seconds (2 minutes) - ML processing can take time
    API_RETRY_ATTEMPTS: 2,
    API_RETRY_DELAY: 1000, // 1 second
    
    // Feature Flags
    ENABLE_LOGGING: true,
    ENABLE_RETRY: true,
    
    // Limits
    MAX_MESSAGES_PER_REQUEST: 100,
    MAX_PREVIEW_LENGTH: 300
};

// Export for use in popup.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}


// Smart Message Organizer - Popup Script
// Phase 4: Backend Integration
// Phase 6: Results UI
// Phase 7: Privacy & Controls
// Enhanced: Insights & Recommendations, Search & Filter

// ============================================================================
// Configuration
// ============================================================================

// Backend API Configuration
// Load from config.js if available, otherwise use defaults
const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) || 'http://localhost:8000';
const API_CONFIG = {
    timeout: (typeof CONFIG !== 'undefined' && CONFIG.API_TIMEOUT) || 30000,
    retryAttempts: (typeof CONFIG !== 'undefined' && CONFIG.API_RETRY_ATTEMPTS) || 2,
    retryDelay: (typeof CONFIG !== 'undefined' && CONFIG.API_RETRY_DELAY) || 1000
};

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Smart Message Organizer popup loaded');
    
    // Initialize UI state (checks permission)
    initializeUI();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize the UI based on permission state
 * Phase 2: Checks chrome.storage for user permission
 */
function initializeUI() {
    // Check if user has granted permission
    chrome.storage.local.get(['userPermission'], (result) => {
        const hasPermission = result.userPermission === true;
        
        const mainContent = document.getElementById('main-content');
        const permissionScreen = document.getElementById('permission-screen');
        
        if (hasPermission) {
            // Permission granted - show main content
            console.log('Permission already granted');
            showMainContent();
        } else {
            // Permission not granted - show permission screen
            console.log('Permission not granted - showing permission screen');
            showPermissionScreen();
        }
    });
}

/**
 * Show permission screen and hide main content
 */
function showPermissionScreen() {
    const mainContent = document.getElementById('main-content');
    const permissionScreen = document.getElementById('permission-screen');
    
    if (permissionScreen) {
        permissionScreen.classList.remove('hidden');
    }
    if (mainContent) {
        mainContent.classList.add('hidden');
    }
}

/**
 * Show main content and hide permission screen
 */
function showMainContent() {
    const mainContent = document.getElementById('main-content');
    const permissionScreen = document.getElementById('permission-screen');
    
    if (mainContent) {
        mainContent.classList.remove('hidden');
    }
    if (permissionScreen) {
        permissionScreen.classList.add('hidden');
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Analyze button (Phase 1)
    const analyzeButton = document.getElementById('analyze-button');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', handleAnalyzeClick);
    }
    
    // Allow button (Phase 2 - placeholder for now)
    const allowButton = document.getElementById('allow-button');
    if (allowButton) {
        allowButton.addEventListener('click', handleAllowClick);
    }
    
    // Cancel button (Phase 2 - placeholder for now)
    const cancelButton = document.getElementById('cancel-button');
    if (cancelButton) {
        cancelButton.addEventListener('click', handleCancelClick);
    }
    
    // Settings button (Phase 7)
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', handleSettingsClick);
    }
    
    // Privacy button (Phase 7)
    const privacyButton = document.getElementById('privacy-button');
    if (privacyButton) {
        privacyButton.addEventListener('click', handlePrivacyClick);
    }
    
    // Retry button (error handling)
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
        retryButton.addEventListener('click', handleRetryClick);
    }
    
    // New Analysis button (Phase 6)
    const newAnalysisButton = document.getElementById('new-analysis-button');
    if (newAnalysisButton) {
        newAnalysisButton.addEventListener('click', handleNewAnalysis);
    }
    
    // Set up category collapse/expand (will be called after results are shown)
    setupCategoryCollapse();
    
    // Settings panel buttons (Phase 7)
    const closeSettingsButton = document.getElementById('close-settings-button');
    if (closeSettingsButton) {
        closeSettingsButton.addEventListener('click', hideSettingsPanel);
    }
    
    const revokePermissionButton = document.getElementById('revoke-permission-button');
    if (revokePermissionButton) {
        revokePermissionButton.addEventListener('click', handleRevokePermission);
    }
    
    const clearDataButton = document.getElementById('clear-data-button');
    if (clearDataButton) {
        clearDataButton.addEventListener('click', handleClearData);
    }
    
    // Privacy modal buttons (Phase 7)
    const closePrivacyModal = document.getElementById('close-privacy-modal');
    const closePrivacyModalFooter = document.getElementById('close-privacy-modal-footer');
    if (closePrivacyModal) {
        closePrivacyModal.addEventListener('click', hidePrivacyModal);
    }
    if (closePrivacyModalFooter) {
        closePrivacyModalFooter.addEventListener('click', hidePrivacyModal);
    }
    
    // Close modal on background click
    const privacyModal = document.getElementById('privacy-modal');
    if (privacyModal) {
        privacyModal.addEventListener('click', (e) => {
            if (e.target === privacyModal) {
                hidePrivacyModal();
            }
        });
    }
}

/**
 * Set up category collapse/expand functionality
 */
function setupCategoryCollapse() {
    const categoryHeaders = document.querySelectorAll('.category-header[data-category]');
    categoryHeaders.forEach(header => {
        // Remove existing listeners to avoid duplicates
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        // Add click listener
        newHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking on badge or button
            if (e.target.classList.contains('badge') || 
                e.target.classList.contains('btn') ||
                e.target.closest('.btn')) {
                return;
            }
            
            newHeader.classList.toggle('collapsed');
        });
    });
}

/**
 * Handle analyze button click
 * Phase 3: Extracts messages from Gmail
 * Phase 4: Sends to backend
 * Phase 6: Displays results
 */
function handleAnalyzeClick() {
    console.log('Analyze button clicked!');
    
    // Hide results from previous analysis
    hideResultsContainer();
    showAnalyzeSection();
    
    // Verify permission is still granted (safety check)
    chrome.storage.local.get(['userPermission'], (result) => {
        if (result.userPermission !== true) {
            // Permission was revoked - show permission screen again
            showPermissionScreen();
            return;
        }
        
        // Permission is granted - proceed with message extraction
        extractMessages();
    });
}

/**
 * Extract messages from Gmail page
 * Phase 3: Communicates with content script to extract visible messages
 */
function extractMessages() {
    // Show loading state
    showLoadingState();
    hideErrorState();
    
    // Update progress: Step 1 - Extracting
    updateLoadingStep('step-extract', 'active', 'Reading your emails...');
    updateProgressBar(10);
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            showErrorState('No active tab found. Please open Gmail in a tab.');
            hideLoadingState();
            return;
        }
        
        const currentTab = tabs[0];
        
        // Check if we're on Gmail
        if (!currentTab.url || !currentTab.url.includes('mail.google.com')) {
            showErrorState('Please navigate to Gmail (mail.google.com) to analyze messages.');
            hideLoadingState();
            return;
        }
        
        // Try to inject content script if not already injected
        injectContentScript(currentTab.id, () => {
            // Send message to content script
            sendMessageToContentScript(currentTab.id);
        });
    });
}

/**
 * Inject content script programmatically if needed
 */
function injectContentScript(tabId, callback) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.log('Content script may already be injected or error:', chrome.runtime.lastError.message);
            // Continue anyway - script might already be there
        } else {
            console.log('Content script injected successfully');
        }
        
        // Wait a moment for script to initialize
        setTimeout(() => {
            if (callback) callback();
        }, 100);
    });
}

/**
 * Send message to content script
 */
function sendMessageToContentScript(tabId) {
    chrome.tabs.sendMessage(
        tabId,
        { action: 'extractMessages' },
        (response) => {
            // Handle Chrome extension API errors
            if (chrome.runtime.lastError) {
                console.error('Error communicating with content script:', chrome.runtime.lastError);
                
                // Hide loading state on error
                hideLoadingState();
                
                // More specific error message
                if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                    showErrorState('Content script not loaded. Please refresh the Gmail page and try again.');
                } else {
                    showErrorState('Failed to connect to Gmail page. Please refresh the page and try again.');
                }
                return;
            }
            
            // Handle response
            if (response && response.success) {
                console.log(`Successfully extracted ${response.count} messages`);
                // Update progress: Step 1 complete
                updateLoadingStep('step-extract', 'completed', `Found ${response.count} messages`);
                // Keep loading state visible - will be hidden after backend processing
                handleExtractedMessages(response.messages);
            } else {
                // Hide loading state on error
                hideLoadingState();
                
                // Handle error response
                const errorMessage = response?.error || 'Failed to extract messages. Please ensure you are on Gmail and have visible emails.';
                console.error('Extraction failed:', errorMessage);
                showErrorState(errorMessage);
            }
        }
    );
}

/**
 * Handle extracted messages
 * Phase 4: Sends messages to backend for classification
 */
function handleExtractedMessages(messages) {
    console.log('Handling extracted messages:', messages);
    
    if (!messages || messages.length === 0) {
        showErrorState('No messages found. Make sure you have visible emails in your Gmail inbox.');
        hideLoadingState();
        return;
    }
    
    // Validate messages
    const validMessages = messages.filter(msg => {
        return msg && 
               msg.id && 
               msg.subject && 
               msg.subject.trim().length > 0;
    });
    
    if (validMessages.length === 0) {
        showErrorState('No valid messages found. Please try again.');
        hideLoadingState();
        return;
    }
    
    console.log(`Validated ${validMessages.length} messages`);
    
    // Update progress: Step 1 complete, moving to Step 2
    updateLoadingStep('step-extract', 'completed', `Found ${validMessages.length} messages`);
    updateLoadingStep('step-send', 'active', 'Preparing for smart analysis...');
    updateProgressBar(20);
    
    // Store messages temporarily
    chrome.storage.local.set({ 
        lastMessages: validMessages,
        lastExtractionTime: new Date().toISOString()
    }, () => {
        console.log('Messages stored temporarily');
        
        // Send to backend for classification
        sendToBackend(validMessages);
    });
}

/**
 * Send messages to backend API for classification
 * Phase 4: Backend communication
 */
async function sendToBackend(messages) {
    console.log(`Sending ${messages.length} messages to backend...`);
    
    try {
        // Prepare request payload
        const payload = {
            messages: messages.map(msg => ({
                id: msg.id,
                subject: msg.subject,
                sender: msg.sender,
                preview: msg.preview || '',
                timestamp: msg.timestamp
            }))
        };
        
        console.log('Sending request to:', `${API_BASE_URL}/classify`);
        console.log('Request payload size:', JSON.stringify(payload).length, 'bytes');
        console.log(`Processing ${messages.length} messages with ML model - this may take 30-60 seconds...`);
        console.log('Please wait - ML classification is in progress...');
        
        // Update progress: Step 1 complete, Step 2 - Sending
        updateLoadingStep('step-extract', 'completed', `Found ${messages.length} messages`);
        updateLoadingStep('step-send', 'completed', 'Ready to analyze');
        updateLoadingStep('step-ml', 'active', 'Analyzing your emails...');
        updateProgressBar(30);
        
        const requestStartTime = Date.now();
        
        // Update progress: Step 2 complete, Step 3 - ML Processing
        updateLoadingStep('step-send', 'completed', 'Ready');
        updateLoadingStep('step-ml', 'active', 'Understanding your emails...');
        updateProgressBar(50);
        updateLoadingTip('Our AI understands context and patterns in your emails!');
        
        // Send request with retry logic
        const response = await fetchWithRetry(
            `${API_BASE_URL}/classify`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            }
        );
        
        // Update progress: Step 3 complete, Step 4 - Generating Insights
        updateLoadingStep('step-ml', 'completed', 'Analysis complete');
        updateLoadingStep('step-insights', 'active', 'Creating recommendations for you...');
        updateProgressBar(80);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const requestTime = Date.now() - requestStartTime;
        console.log(`Backend response received in ${requestTime}ms`);
        console.log('Backend response:', data);
        
        // Update progress: All steps complete
        updateLoadingStep('step-insights', 'completed', 'All set!');
        updateProgressBar(100);
        updateLoadingTip('Done! Your messages are organized and ready.');
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Handle successful classification
        handleClassificationResponse(data);
        
    } catch (error) {
        console.error('Backend communication error:', error);
        
        // Reset progress on error
        resetLoadingProgress();
        hideLoadingState();
        
        // Provide user-friendly error message
        let errorMessage = 'Failed to connect to classification service. ';
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage += 'Please ensure the backend server is running at ' + API_BASE_URL;
        } else if (error.message.includes('timeout')) {
            errorMessage += 'Request timed out. Please try again.';
        } else {
            errorMessage += error.message;
        }
        
        showErrorState(errorMessage);
    }
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, options, attempt = 1) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        options.signal = controller.signal;
        
        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        
        return response;
        
    } catch (error) {
        if (attempt < API_CONFIG.retryAttempts) {
            console.log(`Retry attempt ${attempt + 1}/${API_CONFIG.retryAttempts}`);
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
            return fetchWithRetry(url, options, attempt + 1);
        }
        throw error;
    }
}

/**
 * Handle classification response from backend
 * Phase 4: Processes categorized results
 */
function handleClassificationResponse(data) {
    console.log('Handling classification response:', data);
    
    hideLoadingState();
    
    if (!data || !data.success) {
        showErrorState('Classification failed. Please try again.');
        return;
    }
    
    const { categorized, total, processing_time_ms } = data;
    
    // Store results
    chrome.storage.local.set({
        lastAnalysis: {
            timestamp: new Date().toISOString(),
            totalMessages: total,
            categorized: categorized,
            processingTime: processing_time_ms
        }
    }, () => {
        console.log('Classification results stored');
        
        // Phase 6: Will display results in UI
        // For now, show success message
        const needsReply = categorized.needs_reply?.length || 0;
        const important = categorized.important?.length || 0;
        const ignore = categorized.ignore?.length || 0;
        
        console.log(`✅ Classification complete!`);
        console.log(`   Needs Reply: ${needsReply}`);
        console.log(`   Important: ${important}`);
        console.log(`   Ignore: ${ignore}`);
        console.log(`   Processing time: ${processing_time_ms}ms`);
        
        // Display results in UI (Phase 6)
        showResults(data);
        
        // Log summary
        console.log(`✅ Classification complete!`);
        console.log(`   📧 Total: ${total} messages`);
        console.log(`   🔴 Needs Reply: ${needsReply}`);
        console.log(`   🟡 Important: ${important}`);
        console.log(`   ⚪ Ignore: ${ignore}`);
    });
}

/**
 * Handle allow button click (Phase 2)
 * Stores permission in chrome.storage and shows main content
 */
function handleAllowClick() {
    console.log('User granted permission');
    
    // Store permission in chrome.storage.local
    chrome.storage.local.set({ userPermission: true }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error storing permission:', chrome.runtime.lastError);
            showErrorState('Failed to save permission. Please try again.');
            return;
        }
        
        console.log('Permission stored successfully');
        
        // Hide permission screen and show main content
        showMainContent();
        
        // Optional: Show a brief success message (can be removed for cleaner UX)
        // The UI transition itself is the feedback
    });
}

/**
 * Handle cancel button click (Phase 2)
 * Closes the popup or shows a message
 */
function handleCancelClick() {
    console.log('User denied permission');
    
    // Store that permission was explicitly denied (optional, for analytics)
    chrome.storage.local.set({ userPermission: false }, () => {
        // Close the popup window
        window.close();
    });
}

/**
 * Handle settings button click (Phase 7)
 */
function handleSettingsClick() {
    console.log('Settings clicked');
    showSettingsPanel();
}

/**
 * Handle privacy button click (Phase 7)
 */
function handlePrivacyClick() {
    console.log('Privacy clicked');
    showPrivacyModal();
}

/**
 * Show settings panel (Phase 7)
 */
function showSettingsPanel() {
    const settingsPanel = document.getElementById('settings-panel');
    const mainContent = document.getElementById('main-content');
    const permissionScreen = document.getElementById('permission-screen');
    
    if (settingsPanel) {
        settingsPanel.classList.remove('hidden');
    }
    if (mainContent) {
        mainContent.classList.add('hidden');
    }
    if (permissionScreen) {
        permissionScreen.classList.add('hidden');
    }
}

/**
 * Hide settings panel (Phase 7)
 */
function hideSettingsPanel() {
    const settingsPanel = document.getElementById('settings-panel');
    const mainContent = document.getElementById('main-content');
    
    if (settingsPanel) {
        settingsPanel.classList.add('hidden');
    }
    
    // Show main content or permission screen based on permission status
    checkPermission((hasPermission) => {
        if (hasPermission) {
            if (mainContent) {
                mainContent.classList.remove('hidden');
            }
        } else {
            showPermissionScreen();
        }
    });
}

/**
 * Show privacy modal (Phase 7)
 */
function showPrivacyModal() {
    const privacyModal = document.getElementById('privacy-modal');
    if (privacyModal) {
        privacyModal.classList.remove('hidden');
    }
}

/**
 * Hide privacy modal (Phase 7)
 */
function hidePrivacyModal() {
    const privacyModal = document.getElementById('privacy-modal');
    if (privacyModal) {
        privacyModal.classList.add('hidden');
    }
}

/**
 * Handle revoke permission button (Phase 7)
 */
function handleRevokePermission() {
    if (confirm('Are you sure you want to revoke permission? You will need to grant it again to use the extension.')) {
        chrome.storage.local.remove('userPermission', () => {
            // Clear any cached data
            chrome.storage.local.remove(['lastAnalysis', 'lastMessages', 'lastExtractionTime'], () => {
                console.log('Permission revoked and data cleared');
                
                // Show permission screen
                hideSettingsPanel();
                showPermissionScreen();
                
                // Hide results if any
                hideResultsContainer();
                showAnalyzeSection();
                
                // Show confirmation
                showNotification('Permission revoked. All data cleared.');
            });
        });
    }
}

/**
 * Handle clear data button (Phase 7)
 */
function handleClearData() {
    if (confirm('Are you sure you want to clear all session data? This will remove all stored messages and analysis results.')) {
        chrome.storage.local.remove(['lastAnalysis', 'lastMessages', 'lastExtractionTime'], () => {
            console.log('Session data cleared');
            
            // Hide results
            hideResultsContainer();
            showAnalyzeSection();
            
            // Show confirmation
            showNotification('Session data cleared successfully.');
            
            // Optionally close settings
            hideSettingsPanel();
        });
    }
}

/**
 * Handle retry button click
 */
function handleRetryClick() {
    console.log('Retry clicked');
    // Hide error state and try again
    hideErrorState();
    handleAnalyzeClick();
}

/**
 * Show a notification (simple implementation)
 * Can be replaced with toast notification in future
 */
function showNotification(message) {
    // Simple alert for now
    // In production, could use a toast notification library
    console.log('Notification:', message);
    // Removed alert for cleaner UX - console log only
}

/**
 * Show loading state
 */
function showLoadingState() {
    console.log('Showing loading state...');
    
    const loadingState = document.getElementById('loading-state');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingProgress = document.getElementById('loading-progress');
    const analyzeSection = document.querySelector('.analyze-section');
    
    console.log('Loading state element:', loadingState);
    console.log('Loading progress element:', loadingProgress);
    
    // Hide analyze section
    if (analyzeSection) {
        analyzeSection.style.display = 'none';
        console.log('Analyze section hidden');
    }
    
    if (loadingState) {
        loadingState.classList.remove('hidden');
        console.log('Loading state shown');
    } else {
        console.error('Loading state element not found!');
    }
    
    if (analyzeButton) {
        analyzeButton.disabled = true;
    }
    
    if (loadingProgress) {
        loadingProgress.classList.remove('hidden');
        console.log('Loading progress shown');
    } else {
        console.error('Loading progress element not found!');
    }
    
    // Initialize progress steps
    initializeLoadingProgress();
    
    console.log('Loading state fully shown');
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    const loadingState = document.getElementById('loading-state');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingProgress = document.getElementById('loading-progress');
    
    if (loadingState) {
        loadingState.classList.add('hidden');
    }
    if (analyzeButton) {
        analyzeButton.disabled = false;
    }
    if (loadingProgress) {
        loadingProgress.classList.add('hidden');
    }
    
    // Reset progress
    resetLoadingProgress();
}

/**
 * Initialize loading progress interface
 */
function initializeLoadingProgress() {
    console.log('Initializing loading progress...');
    
    // Reset all steps
    const steps = ['step-extract', 'step-send', 'step-ml', 'step-insights'];
    steps.forEach(stepId => {
        const step = document.getElementById(stepId);
        if (step) {
            step.classList.remove('active', 'completed');
            console.log(`Reset step: ${stepId}`);
        } else {
            console.warn(`Step element not found: ${stepId}`);
        }
    });
    
    // Reset progress bar
    updateProgressBar(0);
    
    // Set initial tip
    updateLoadingTip('We\'re organizing your emails smartly...');
    
    console.log('Loading progress initialized');
}

/**
 * Update loading step status
 */
function updateLoadingStep(stepId, status, statusText) {
    const step = document.getElementById(stepId);
    if (!step) return;
    
    // Remove all status classes
    step.classList.remove('active', 'completed');
    
    // Add new status
    if (status === 'active' || status === 'completed') {
        step.classList.add(status);
    }
    
    // Update status text
    const statusEl = step.querySelector('.step-status');
    if (statusEl) {
        statusEl.textContent = statusText;
    }
}

/**
 * Update progress bar
 */
function updateProgressBar(percentage) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    if (progressText) {
        progressText.textContent = `${percentage}%`;
    }
}

/**
 * Update loading tip
 */
function updateLoadingTip(tip) {
    const tipText = document.getElementById('loading-tip');
    if (tipText) {
        const textEl = tipText.querySelector('.tip-text');
        if (textEl) {
            textEl.textContent = tip;
        }
    }
}

/**
 * Reset loading progress
 */
function resetLoadingProgress() {
    const steps = ['step-extract', 'step-send', 'step-ml', 'step-insights'];
    steps.forEach(stepId => {
        const step = document.getElementById(stepId);
        if (step) {
            step.classList.remove('active', 'completed');
        }
    });
    updateProgressBar(0);
}

/**
 * Show error state
 */
function showErrorState(message) {
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    if (errorState) {
        errorState.classList.remove('hidden');
    }
    if (errorMessage) {
        errorMessage.textContent = message || 'An error occurred';
    }
}

/**
 * Hide error state
 */
function hideErrorState() {
    const errorState = document.getElementById('error-state');
    if (errorState) {
        errorState.classList.add('hidden');
    }
}

/**
 * Show results container (Phase 6)
 * Displays categorized messages in the UI
 */
function showResults(data) {
    console.log('Displaying results in UI:', data);
    
    if (!data || !data.categorized) {
        console.warn('Invalid results data');
        return;
    }
    
    const { categorized, total } = data;
    
    // Hide analyze section and error state
    hideAnalyzeSection();
    hideErrorState();
    
    // Generate and display insights
    generateAndDisplayInsights(data);
    
    // Update counts
    updateCounts(total, categorized);
    
    // Render each category
    renderCategory('needs-reply-list', categorized.needs_reply || [], 'needs_reply');
    renderCategory('important-list', categorized.important || [], 'important');
    renderCategory('ignore-list', categorized.ignore || [], 'ignore');
    
    // Show results container
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
        resultsContainer.classList.remove('hidden');
        
        // Scroll to top of results
        resultsContainer.scrollTop = 0;
        
        // Set up category collapse after results are shown
        setTimeout(() => {
            setupCategoryCollapse();
            initializeSearchAndFilter(); // Initialize search/filter
        }, 100);
    }
}

/**
 * Update count badges and total
 */
function updateCounts(total, categorized) {
    const totalCountEl = document.getElementById('total-count');
    const needsReplyCountEl = document.getElementById('needs-reply-count');
    const importantCountEl = document.getElementById('important-count');
    const ignoreCountEl = document.getElementById('ignore-count');
    
    if (totalCountEl) {
        totalCountEl.textContent = total;
    }
    
    if (needsReplyCountEl) {
        needsReplyCountEl.textContent = (categorized.needs_reply || []).length;
    }
    
    if (importantCountEl) {
        importantCountEl.textContent = (categorized.important || []).length;
    }
    
    if (ignoreCountEl) {
        ignoreCountEl.textContent = (categorized.ignore || []).length;
    }
}

/**
 * Render messages in a category
 */
function renderCategory(listId, messages, categoryType) {
    const list = document.getElementById(listId);
    if (!list) {
        console.error(`List element not found: ${listId}`);
        return;
    }
    
    // Clear existing content
    list.innerHTML = '';
    
    // Handle empty category
    if (!messages || messages.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No messages in this category';
        list.appendChild(emptyState);
        return;
    }
    
    // Render each message
    messages.forEach((message) => {
        const card = createMessageCard(message, categoryType);
        list.appendChild(card);
    });
}

/**
 * Create a message card element
 */
function createMessageCard(message, categoryType) {
    const card = document.createElement('div');
    card.className = 'message-card';
    
    // Add urgent class for needs_reply
    if (categoryType === 'needs_reply') {
        card.classList.add('urgent');
    }
    
    // Message header (sender and timestamp)
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const sender = document.createElement('span');
    sender.className = 'sender';
    
    // Highlight search terms in sender if searching
    const searchQuery = getCurrentSearchQuery();
    if (searchQuery) {
        sender.innerHTML = highlightSearchTerm(escapeHtml(message.sender || 'Unknown'), searchQuery);
    } else {
        sender.textContent = escapeHtml(message.sender || 'Unknown');
    }
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatTimestamp(message.timestamp);
    
    header.appendChild(sender);
    header.appendChild(timestamp);
    
    // Subject
    const subject = document.createElement('div');
    subject.className = 'message-subject';
    
    // Highlight search terms in subject if searching
    if (searchQuery) {
        subject.innerHTML = highlightSearchTerm(escapeHtml(message.subject || 'No subject'), searchQuery);
    } else {
        subject.textContent = escapeHtml(message.subject || 'No subject');
    }
    
    // Preview (if available)
    let preview = null;
    if (message.preview && message.preview.trim()) {
        preview = document.createElement('div');
        preview.className = 'message-preview';
        
        // Highlight search terms in preview if searching
        if (searchQuery) {
            preview.innerHTML = highlightSearchTerm(escapeHtml(message.preview), searchQuery);
        } else {
            preview.textContent = escapeHtml(message.preview);
        }
    }
    
    // Assemble card
    card.appendChild(header);
    card.appendChild(subject);
    if (preview) {
        card.appendChild(preview);
    }
    
    // Add click handler to open in Gmail (optional enhancement)
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
        // Could open message in Gmail (future enhancement)
        console.log('Message clicked:', message.id);
    });
    
    return card;
}

/**
 * Hide analyze section
 */
function hideAnalyzeSection() {
    const analyzeSection = document.querySelector('.analyze-section');
    if (analyzeSection) {
        analyzeSection.classList.add('hidden');
    }
}

/**
 * Show analyze section
 */
function showAnalyzeSection() {
    const analyzeSection = document.querySelector('.analyze-section');
    if (analyzeSection) {
        analyzeSection.classList.remove('hidden');
        analyzeSection.style.display = 'block'; // Ensure it's visible
    }
}

/**
 * Hide results container
 */
function hideResultsContainer() {
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
        resultsContainer.classList.add('hidden');
    }
}

/**
 * Handle new analysis button click
 */
function handleNewAnalysis() {
    console.log('New analysis requested');
    
    // Hide all result-related UI
    hideResultsContainer();
    hideLoadingState();
    hideErrorState();
    
    // Reset loading progress
    resetLoadingProgress();
    
    // Show analyze section
    showAnalyzeSection();
    
    // Ensure main content is visible
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.classList.remove('hidden');
    }
    
    // Clear previous results from storage (optional)
    chrome.storage.local.remove(['lastAnalysis'], () => {
        console.log('Previous analysis cleared');
    });
    
    console.log('UI reset - ready for new analysis');
}

/**
 * Check if user is on Gmail page
 */
function checkGmailPage(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            if (callback) callback(false);
            return;
        }
        
        const isGmail = tabs[0].url && tabs[0].url.includes('mail.google.com');
        if (callback) callback(isGmail);
    });
}

/**
 * Utility function to escape HTML (for XSS prevention)
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Check if user has granted permission
 * @param {Function} callback - Callback with (hasPermission) parameter
 */
function checkPermission(callback) {
    chrome.storage.local.get(['userPermission'], (result) => {
        const hasPermission = result.userPermission === true;
        if (callback) {
            callback(hasPermission);
        }
    });
}

/**
 * Revoke permission (for Phase 7 - Settings)
 */
function revokePermission() {
    chrome.storage.local.remove('userPermission', () => {
        console.log('Permission revoked');
        showPermissionScreen();
    });
}

// ============================================================================
// Search and Filter Functionality
// ============================================================================

// Search and filter state
let currentSearchQuery = '';
let currentCategoryFilter = 'all';
let currentSortOption = 'priority-desc';

/**
 * Initialize search and filter functionality
 */
function initializeSearchAndFilter() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const categoryFilter = document.getElementById('category-filter');
    const sortSelect = document.getElementById('sort-select');
    
    // Real-time search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.trim();
            if (currentSearchQuery) {
                if (clearSearchBtn) clearSearchBtn.style.display = 'block';
            } else {
                if (clearSearchBtn) clearSearchBtn.style.display = 'none';
            }
            applySearchAndFilter();
        });
        
        // Search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applySearchAndFilter();
            }
        });
    }
    
    // Clear search
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                currentSearchQuery = '';
                clearSearchBtn.style.display = 'none';
                applySearchAndFilter();
            }
        });
    }
    
    // Category filter
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentCategoryFilter = e.target.value;
            applySearchAndFilter();
        });
    }
    
    // Sort
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSortOption = e.target.value;
            applySearchAndFilter();
        });
    }
}

/**
 * Get current search query
 */
function getCurrentSearchQuery() {
    return currentSearchQuery;
}

/**
 * Apply search and filter to current results
 */
function applySearchAndFilter() {
    chrome.storage.local.get(['lastAnalysis'], (result) => {
        if (!result.lastAnalysis) {
            return;
        }
        
        const data = result.lastAnalysis;
        let allMessages = [];
        
        // Collect messages based on category filter
        if (currentCategoryFilter === 'all') {
            allMessages = [
                ...(data.categorized.needs_reply || []),
                ...(data.categorized.important || []),
                ...(data.categorized.ignore || [])
            ];
        } else {
            allMessages = data.categorized[currentCategoryFilter] || [];
        }
        
        // Apply search
        let filteredMessages = allMessages;
        if (currentSearchQuery) {
            filteredMessages = searchMessages(currentSearchQuery, allMessages);
        }
        
        // Apply sort
        filteredMessages = sortMessages(filteredMessages, currentSortOption);
        
        // Update UI with filtered results
        displayFilteredResults(filteredMessages, data);
        
        // Update search results count
        updateSearchResultsCount(filteredMessages.length, allMessages.length);
    });
}

/**
 * Search messages by query
 */
function searchMessages(query, messages) {
    if (!query || !messages) return messages;
    
    const lowerQuery = query.toLowerCase();
    
    return messages.filter(msg => {
        const subjectMatch = (msg.subject || '').toLowerCase().includes(lowerQuery);
        const senderMatch = (msg.sender || '').toLowerCase().includes(lowerQuery);
        const previewMatch = (msg.preview || '').toLowerCase().includes(lowerQuery);
        const categoryMatch = (msg.category || '').toLowerCase().includes(lowerQuery);
        
        return subjectMatch || senderMatch || previewMatch || categoryMatch;
    });
}

/**
 * Sort messages
 */
function sortMessages(messages, sortOption) {
    if (!messages || messages.length === 0) return messages;
    
    const [field, order] = sortOption.split('-');
    const sorted = [...messages].sort((a, b) => {
        let comparison = 0;
        
        switch(field) {
            case 'date':
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                comparison = dateA - dateB;
                break;
            case 'sender':
                comparison = (a.sender || '').localeCompare(b.sender || '');
                break;
            case 'subject':
                comparison = (a.subject || '').localeCompare(b.subject || '');
                break;
            case 'priority':
                const priority = { needs_reply: 3, important: 2, ignore: 1 };
                comparison = (priority[b.category] || 0) - (priority[a.category] || 0);
                break;
            default:
                comparison = 0;
        }
        
        return order === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
}

/**
 * Display filtered results
 */
function displayFilteredResults(messages, originalData) {
    // Group by category
    const categorized = {
        needs_reply: messages.filter(m => m.category === 'needs_reply'),
        important: messages.filter(m => m.category === 'important'),
        ignore: messages.filter(m => m.category === 'ignore')
    };
    
    // Update counts with filtered results
    updateCounts(messages.length, categorized);
    
    // Re-render categories with filtered messages
    renderCategory('needs-reply-list', categorized.needs_reply, 'needs_reply');
    renderCategory('important-list', categorized.important, 'important');
    renderCategory('ignore-list', categorized.ignore, 'ignore');
}

/**
 * Update search results count
 */
function updateSearchResultsCount(filteredCount, totalCount) {
    const countElement = document.getElementById('search-results-count');
    if (!countElement) return;
    
    if (currentSearchQuery || currentCategoryFilter !== 'all') {
        countElement.classList.remove('hidden');
        if (currentSearchQuery && currentCategoryFilter !== 'all') {
            countElement.textContent = `Found ${filteredCount} of ${totalCount} messages (filtered by "${currentSearchQuery}" and ${currentCategoryFilter})`;
        } else if (currentSearchQuery) {
            countElement.textContent = `Found ${filteredCount} of ${totalCount} messages matching "${currentSearchQuery}"`;
        } else {
            countElement.textContent = `Showing ${filteredCount} messages in ${currentCategoryFilter}`;
        }
    } else {
        countElement.classList.add('hidden');
    }
}

/**
 * Highlight search terms in text
 */
function highlightSearchTerm(text, query) {
    if (!query || !text) return escapeHtml(text);
    
    try {
        const escapedQuery = escapeRegex(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        const escapedText = escapeHtml(text);
        return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch (e) {
        return escapeHtml(text);
    }
}

/**
 * Escape regex special characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Insights & Recommendations System
// ============================================================================

/**
 * Generate and display insights
 * Uses AI insights from backend if available, otherwise falls back to rule-based
 */
function generateAndDisplayInsights(data) {
    if (!data || !data.categorized) return;
    
    // Use AI insights from backend if available
    let insights = null;
    if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        console.log('Using AI-generated insights from backend');
        insights = data.insights;
    } else {
        // Fallback to rule-based insights
        console.log('Using rule-based insights (AI insights not available)');
        insights = generateInsights(data);
    }
    
    if (!insights || insights.length === 0) {
        const insightsSection = document.getElementById('insights-section');
        if (insightsSection) {
            insightsSection.classList.add('hidden');
        }
        return;
    }
    
    // Display insights
    displayInsights(insights);
}

/**
 * Generate insights from analysis data
 */
function generateInsights(data) {
    const insights = [];
    const { categorized, total } = data;
    
    const needsReply = (categorized.needs_reply || []).length;
    const important = (categorized.important || []).length;
    const ignore = (categorized.ignore || []).length;
    
    // Insight 1: High needs_reply count
    if (needsReply > 10) {
        insights.push({
            type: 'warning',
            icon: '🔴',
            title: 'High Priority Messages',
            message: `You have ${needsReply} messages requiring your attention. Consider addressing urgent ones first.`,
            priority: 'high'
        });
    } else if (needsReply > 5) {
        insights.push({
            type: 'info',
            icon: '📋',
            title: 'Action Items',
            message: `You have ${needsReply} messages that need a reply.`,
            priority: 'medium'
        });
    }
    
    // Insight 2: Mostly ignore category
    const ignorePercentage = (ignore / total) * 100;
    if (ignorePercentage > 60 && ignore > 20) {
        insights.push({
            type: 'info',
            icon: '📧',
            title: 'Email Management',
            message: `${Math.round(ignorePercentage)}% of your emails are low-priority. Consider unsubscribing from newsletters.`,
            priority: 'low'
        });
    }
    
    // Insight 3: Check for Google Classroom
    const classroomMessages = [
        ...(categorized.needs_reply || []),
        ...(categorized.important || [])
    ].filter(msg => 
        (msg.sender || '').includes('classroom.google.com') ||
        (msg.subject || '').toLowerCase().includes('announcement') ||
        (msg.subject || '').toLowerCase().includes('assignment')
    );
    
    if (classroomMessages.length > 0) {
        insights.push({
            type: 'success',
            icon: '🎓',
            title: 'Educational Content',
            message: `Found ${classroomMessages.length} messages from Google Classroom. These are marked as important.`,
            priority: 'medium'
        });
    }
    
    // Insight 4: Sender analysis
    const senderCounts = {};
    [
        ...(categorized.needs_reply || []),
        ...(categorized.important || [])
    ].forEach(msg => {
        const domain = extractDomain(msg.sender);
        if (domain) {
            senderCounts[domain] = (senderCounts[domain] || 0) + 1;
        }
    });
    
    const topSender = Object.entries(senderCounts)
        .sort((a, b) => b[1] - a[1])[0];
    
    if (topSender && topSender[1] > 5) {
        insights.push({
            type: 'info',
            icon: '📬',
            title: 'Top Sender',
            message: `Most of your important messages are from ${topSender[0]} (${topSender[1]} messages).`,
            priority: 'low'
        });
    }
    
    // Insight 5: Assignment detection
    const assignments = [
        ...(categorized.needs_reply || []),
        ...(categorized.important || [])
    ].filter(msg => {
        const text = (msg.subject + ' ' + msg.preview).toLowerCase();
        return text.includes('assignment') || 
               text.includes('homework') || 
               text.includes('due') ||
               text.includes('submit');
    });
    
    if (assignments.length > 0) {
        insights.push({
            type: 'warning',
            icon: '📝',
            title: 'Assignments Detected',
            message: `Found ${assignments.length} message${assignments.length > 1 ? 's' : ''} related to assignments. Check deadlines!`,
            priority: 'high'
        });
    }
    
    // Insight 6: Empty needs_reply (good!)
    if (needsReply === 0 && total > 10) {
        insights.push({
            type: 'success',
            icon: '✅',
            title: 'All Caught Up!',
            message: 'Great job! You have no messages requiring immediate reply.',
            priority: 'low'
        });
    }
    
    // Insight 7: Processing time
    if (data.processingTime && data.processingTime < 20) {
        insights.push({
            type: 'success',
            icon: '⚡',
            title: 'Fast Processing',
            message: `Messages classified in ${data.processingTime}ms. System is running efficiently!`,
            priority: 'low'
        });
    }
    
    // Sort insights by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    insights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
    return insights;
}

/**
 * Extract domain from email
 */
function extractDomain(email) {
    if (!email) return null;
    const match = email.match(/@([^@]+)$/);
    return match ? match[1] : null;
}

/**
 * Display insights in UI
 */
function displayInsights(insights) {
    const insightsSection = document.getElementById('insights-section');
    const insightsList = document.getElementById('insights-list');
    
    if (!insightsSection || !insightsList) return;
    
    // Clear existing insights
    insightsList.innerHTML = '';
    
    if (insights.length === 0) {
        insightsSection.classList.add('hidden');
        return;
    }
    
    // Show insights section
    insightsSection.classList.remove('hidden');
    
    // Create insight cards
    insights.forEach(insight => {
        const insightCard = createInsightCard(insight);
        insightsList.appendChild(insightCard);
    });
}

/**
 * Create insight card element
 */
function createInsightCard(insight) {
    const card = document.createElement('div');
    card.className = `insight-card insight-${insight.type}`;
    
    const icon = document.createElement('div');
    icon.className = 'insight-icon';
    icon.textContent = insight.icon || '💡';
    
    const content = document.createElement('div');
    content.className = 'insight-content';
    
    const title = document.createElement('div');
    title.className = 'insight-title';
    title.textContent = insight.title;
    
    const message = document.createElement('div');
    message.className = 'insight-message';
    message.textContent = insight.message;
    
    content.appendChild(title);
    content.appendChild(message);
    
    card.appendChild(icon);
    card.appendChild(content);
    
    return card;
}

/**
 * Utility function to format timestamp
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}


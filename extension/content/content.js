// Smart Message Organizer - Content Script
// Phase 3: Gmail Message Extraction

console.log('Smart Message Organizer content script loaded');

/**
 * Extract visible email messages from Gmail page
 * Uses multiple selector strategies to handle Gmail's dynamic DOM
 */
function extractVisibleMessages() {
    const messages = [];
    const maxMessages = 50; // Limit to prevent performance issues
    
    try {
        // Strategy 1: Try thread rows (most common Gmail structure)
        let emailElements = document.querySelectorAll('tr[role="row"]:not([role="columnheader"])');
        
        // Strategy 2: If no rows found, try div-based structure
        if (emailElements.length === 0) {
            emailElements = document.querySelectorAll('div[role="main"] > div > div > div[jsmodel]');
        }
        
        // Strategy 3: Fallback to any visible email containers
        if (emailElements.length === 0) {
            emailElements = document.querySelectorAll('[data-thread-perm-id], [data-legacy-thread-id]');
        }
        
        console.log(`Found ${emailElements.length} potential email elements`);
        
        emailElements.forEach((element, index) => {
            if (messages.length >= maxMessages) return;
            
            try {
                // Extract subject line
                let subject = '';
                
                // Try multiple selectors for subject
                const subjectSelectors = [
                    'span[email]',
                    '.bog',
                    '[data-thread-id]',
                    '.bqe',
                    'span.y2',
                    '.y6 span'
                ];
                
                for (const selector of subjectSelectors) {
                    const subjectEl = element.querySelector(selector);
                    if (subjectEl) {
                        subject = subjectEl.textContent?.trim() || '';
                        if (subject) break;
                    }
                }
                
                // If still no subject, try getting text from the row itself
                if (!subject) {
                    const textElements = element.querySelectorAll('span, div');
                    for (const el of textElements) {
                        const text = el.textContent?.trim();
                        if (text && text.length > 5 && text.length < 200) {
                            subject = text;
                            break;
                        }
                    }
                }
                
                // Extract sender
                let sender = 'Unknown';
                const senderSelectors = [
                    'span[email]',
                    '.yW',
                    '[email]',
                    '.yX',
                    '.zF'
                ];
                
                for (const selector of senderSelectors) {
                    const senderEl = element.querySelector(selector);
                    if (senderEl) {
                        const senderText = senderEl.textContent?.trim();
                        const emailAttr = senderEl.getAttribute('email');
                        sender = emailAttr || senderText || 'Unknown';
                        if (sender && sender !== 'Unknown') break;
                    }
                }
                
                // Extract preview/snippet
                let preview = '';
                const previewSelectors = [
                    '.bog',
                    '.y2',
                    '.y6',
                    '[class*="snippet"]',
                    '.bqe'
                ];
                
                for (const selector of previewSelectors) {
                    const previewEl = element.querySelector(selector);
                    if (previewEl) {
                        preview = previewEl.textContent?.trim() || '';
                        if (preview && preview !== subject) break;
                    }
                }
                
                // Extract timestamp (optional)
                let timestamp = new Date().toISOString();
                const timeSelectors = [
                    '.xW',
                    '.xY',
                    '[title*=":"]',
                    '.bqe'
                ];
                
                for (const selector of timeSelectors) {
                    const timeEl = element.querySelector(selector);
                    if (timeEl) {
                        const timeText = timeEl.textContent?.trim();
                        const timeTitle = timeEl.getAttribute('title');
                        if (timeTitle) {
                            try {
                                timestamp = new Date(timeTitle).toISOString();
                            } catch (e) {
                                // Keep default timestamp
                            }
                        }
                    }
                }
                
                // Only add message if we have at least a subject
                if (subject && subject.length > 0) {
                    // Clean up subject (remove extra whitespace)
                    subject = subject.replace(/\s+/g, ' ').trim();
                    
                    // Limit subject length
                    if (subject.length > 200) {
                        subject = subject.substring(0, 200) + '...';
                    }
                    
                    // Limit preview length
                    if (preview.length > 300) {
                        preview = preview.substring(0, 300) + '...';
                    }
                    
                    messages.push({
                        id: `msg_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        subject: subject,
                        sender: sender || 'Unknown',
                        preview: preview || '',
                        timestamp: timestamp
                    });
                }
            } catch (error) {
                console.error('Error extracting message from element:', error);
                // Continue with next element
            }
        });
        
        console.log(`Successfully extracted ${messages.length} messages`);
        return messages;
        
    } catch (error) {
        console.error('Error in extractVisibleMessages:', error);
        return [];
    }
}

/**
 * Check if current page is Gmail
 */
function isGmailPage() {
    return window.location.hostname === 'mail.google.com' ||
           window.location.href.includes('mail.google.com');
}

/**
 * Get page information for debugging
 */
function getPageInfo() {
    return {
        url: window.location.href,
        hostname: window.location.hostname,
        isGmail: isGmailPage(),
        title: document.title
    };
}

// Prevent multiple listeners if script is injected multiple times
if (!window.smartMessageOrganizerInitialized) {
    window.smartMessageOrganizerInitialized = true;
    
    // Listen for extraction request from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Content script received message:', request);
        
        if (request.action === 'extractMessages') {
            // Check if we're on Gmail
            if (!isGmailPage()) {
                sendResponse({
                    success: false,
                    error: 'Not on Gmail page. Please navigate to Gmail first.',
                    pageInfo: getPageInfo()
                });
                return true;
            }
            
            // Extract messages
            const messages = extractVisibleMessages();
            
            if (messages.length === 0) {
                sendResponse({
                    success: false,
                    error: 'No messages found. Make sure you are viewing your inbox with visible emails.',
                    pageInfo: getPageInfo()
                });
                return true;
            }
            
            sendResponse({
                success: true,
                messages: messages,
                count: messages.length,
                pageInfo: getPageInfo()
            });
            
            return true; // Keep message channel open for async response
        }
        
        if (request.action === 'checkGmail') {
            sendResponse({
                isGmail: isGmailPage(),
                pageInfo: getPageInfo()
            });
            return true;
        }
        
        return false;
    });
    
    // Log that content script is ready
    console.log('Smart Message Organizer content script ready');
} else {
    console.log('Smart Message Organizer content script already initialized');
}

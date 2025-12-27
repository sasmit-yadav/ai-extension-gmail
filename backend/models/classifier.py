"""
Message Classifier - Rule-based classification (Fallback)
NOTE: This is kept as a fallback for the ML classifier.
The ML classifier (ml_classifier.py) uses this when ML models fail or are unavailable.
This ensures the system always works, even without ML dependencies.
"""

from typing import List, Dict
from pydantic import BaseModel
import re
import logging

# Define Message model here to avoid circular import
class Message(BaseModel):
    """Message model for classification"""
    id: str
    subject: str
    sender: str
    preview: str = ""
    timestamp: str
    category: str = None

logger = logging.getLogger(__name__)

class MessageClassifier:
    """
    Classifies email messages into categories using rule-based logic.
    Designed to be easily replaceable with LLM-based classification.
    """
    
    def __init__(self):
        # Keywords for "Needs Reply" category
        self.reply_keywords = [
            'question', '?', 'please', 'request', 'urgent',
            'asap', 'deadline', 'meeting', 'call', 'respond',
            'reply', 'answer', 'confirm', 'approve', 'review',
            'action required', 'need your', 'would you', 'can you',
            'could you', 'should we', 'when can', 'what time',
            'schedule', 'availability', 'feedback', 'input',
            'submit', 'complete', 'fill out', 'required', 'must'
        ]
        
        # Keywords for "Important" category
        self.important_keywords = [
            'important', 'critical', 'priority', 'action required',
            'confirmation', 'approval', 'decision', 'review',
            'update', 'announcement', 'notice', 'reminder',
            'deadline', 'due date', 'meeting', 'conference',
            'project', 'task', 'assignment', 'report',
            'class', 'course', 'homework', 'exam', 'test', 'quiz',
            'grade', 'grades', 'syllabus', 'lecture', 'lesson',
            'teacher', 'professor', 'instructor', 'student',
            'academic', 'education', 'school', 'university',
            'new post', 'new assignment', 'new material'
        ]
        
        # Keywords for "Ignore" category (context-aware)
        # Only ignore if NOT from important sources
        self.ignore_keywords = [
            'unsubscribe', 'newsletter', 'promotion', 'spam',
            'no-reply', 'noreply', 'donotreply',
            'marketing', 'advertisement', 'deal',
            'offer', 'discount', 'sale',
            'digest', 'summary', 'weekly', 'monthly',
            'social media', 'facebook', 'twitter', 'linkedin',
            'instagram', 'youtube', 'subscription',
            'promotional', 'special offer', 'limited time'
        ]
        
        # IMPORTANT: Sender patterns that should NEVER be ignored
        # These override ignore keywords
        self.important_sender_patterns = [
            r'classroom\.google\.com',
            r'@.*\.edu',
            r'teacher@',
            r'professor@',
            r'instructor@',
            r'faculty@',
            r'staff@.*\.edu',
            r'admin@.*\.edu',
            r'@.*school',
            r'@.*university',
            r'@.*college',
            r'@.*academy'
        ]
        
        # Informational keywords (announcements, updates - don't need reply)
        self.informational_keywords = [
            'announcement', 'announcements', 'new announcement',
            'update', 'updates', 'notice', 'notices',
            'reminder', 'reminders', 'information', 'info',
            'posted', 'shared', 'published', 'available'
        ]
        
        # No-reply senders (informational, not action items)
        self.no_reply_patterns = [
            r'no-reply@',
            r'noreply@',
            r'no_reply@',
            r'donotreply@',
            r'do-not-reply@'
        ]
        
        # Important domain patterns
        self.important_domains = [
            'classroom.google.com',
            'edu',
            'school',
            'university',
            'college',
            'academy'
        ]
        
        # Sender patterns to ignore (only if not from important sources)
        self.ignore_sender_patterns = [
            r'noreply@',
            r'no-reply@',
            r'donotreply@',
            r'newsletter@',
            r'marketing@',
            r'promo@',
            r'deals@',
            r'offers@'
        ]
        
        # Context-aware ignore keywords (only in specific contexts)
        # These are ignored only if combined with marketing patterns
        self.contextual_ignore_keywords = [
            'notification',  # Only ignore if from marketing, not from important sources
            'automated'       # Only ignore if from marketing, not from important sources
        ]
    
    def _is_important_sender(self, sender: str) -> bool:
        """
        Check if sender is from an important source (teacher, school, etc.)
        
        Args:
            sender: Sender email or name
            
        Returns:
            True if sender is from important source
        """
        sender_lower = sender.lower()
        
        # Check important sender patterns
        for pattern in self.important_sender_patterns:
            if re.search(pattern, sender_lower):
                return True
        
        # Check for important domains
        for domain in self.important_domains:
            if domain in sender_lower:
                return True
        
        # Check for educational keywords in sender name
        educational_keywords = ['teacher', 'professor', 'instructor', 'faculty', 'staff', 'admin']
        for keyword in educational_keywords:
            if keyword in sender_lower:
                return True
        
        return False
    
    def _is_marketing_sender(self, sender: str) -> bool:
        """
        Check if sender is from marketing/promotional source
        
        Args:
            sender: Sender email or name
            
        Returns:
            True if sender is from marketing source
        """
        sender_lower = sender.lower()
        
        # Check ignore sender patterns
        for pattern in self.ignore_sender_patterns:
            if re.search(pattern, sender_lower):
                return True
        
        # Check for marketing domains
        marketing_domains = ['marketing', 'promo', 'deals', 'offers', 'newsletter']
        for domain in marketing_domains:
            if domain in sender_lower:
                return True
        
        return False
    
    def classify_message(self, message: Message) -> str:
        """
        Classify a single message into a category with improved accuracy.
        
        Args:
            message: Message object to classify
            
        Returns:
            Category string: "needs_reply", "important", or "ignore"
        """
        # Combine subject and preview for analysis
        subject_lower = message.subject.lower()
        preview_lower = message.preview.lower() if message.preview else ""
        sender_lower = message.sender.lower() if message.sender else ""
        combined_text = f"{subject_lower} {preview_lower}"
        
        # Check if sender is from important source (teacher, school, etc.)
        is_important_sender = self._is_important_sender(message.sender)
        is_marketing_sender = self._is_marketing_sender(message.sender)
        
        # Check if sender is no-reply (informational, not action items)
        is_no_reply_sender = any(re.search(pattern, sender_lower) for pattern in self.no_reply_patterns)
        
        # Check if message is informational (announcement, update, etc.)
        is_informational = any(kw in combined_text for kw in self.informational_keywords)
        
        # PRIORITY 1: Important senders should NEVER be ignored
        # Google Classroom, teachers, schools, etc. are always important
        if is_important_sender:
            # BUT: No-reply senders with announcements are informational, not needs_reply
            if is_no_reply_sender and is_informational:
                # Announcements from no-reply are important but don't need reply
                logger.debug(f"Message {message.id} classified as 'important' (announcement from no-reply sender)")
                return "important"
            
            # Check for needs_reply indicators (only if not a no-reply announcement)
            reply_score = 0
            for keyword in self.reply_keywords:
                if keyword in combined_text:
                    reply_score += 1
            
            # Check for question marks (strong indicator of needs reply)
            if '?' in combined_text:
                reply_score += 2  # Questions need replies
            
            # Check for assignment/homework keywords that require action
            assignment_keywords = ['assignment', 'homework', 'due', 'submit', 'complete', 'required', 'deadline']
            has_assignment = any(kw in combined_text for kw in assignment_keywords)
            
            # Check for direct requests
            request_phrases = ['please', 'need your', 'would you', 'can you', 'could you', 'action required']
            has_request = any(phrase in combined_text for phrase in request_phrases)
            
            # Needs reply: Strong indicators
            if reply_score >= 3 or (reply_score >= 2 and '?' in combined_text):
                logger.debug(f"Message {message.id} classified as 'needs_reply' (important sender, strong reply indicators)")
                return "needs_reply"
            elif has_assignment and (reply_score >= 1 or has_request):
                logger.debug(f"Message {message.id} classified as 'needs_reply' (important sender, assignment with request)")
                return "needs_reply"
            elif has_request and reply_score >= 1:
                logger.debug(f"Message {message.id} classified as 'needs_reply' (important sender, direct request)")
                return "needs_reply"
            else:
                # Important but informational (announcements, updates)
                logger.debug(f"Message {message.id} classified as 'important' (important sender, informational)")
                return "important"
        
        # PRIORITY 2: Check for ignore patterns (only if not important sender)
        # Check sender patterns for marketing
        if is_marketing_sender:
            logger.debug(f"Message {message.id} classified as 'ignore' (marketing sender)")
            return "ignore"
        
        # Check ignore keywords (context-aware)
        for keyword in self.ignore_keywords:
            if keyword in combined_text:
                # Only ignore if it's from marketing source
                if is_marketing_sender:
                    logger.debug(f"Message {message.id} classified as 'ignore' (keyword: {keyword}, marketing)")
                    return "ignore"
                # If it's a contextual ignore keyword, check context
                if keyword in self.contextual_ignore_keywords:
                    # Only ignore if combined with marketing patterns
                    marketing_indicators = ['promotion', 'deal', 'offer', 'sale', 'discount', 'marketing']
                    if any(indicator in combined_text for indicator in marketing_indicators):
                        logger.debug(f"Message {message.id} classified as 'ignore' (contextual: {keyword})")
                        return "ignore"
                    # Otherwise, continue to classification
        
        # PRIORITY 3: Check for needs reply (high priority)
        reply_score = 0
        for keyword in self.reply_keywords:
            if keyword in combined_text:
                reply_score += 1
        
        # Check for question marks (strong indicator)
        if '?' in combined_text:
            reply_score += 2  # Questions are strong indicators
        
        # Check for assignment/homework keywords
        assignment_keywords = ['assignment', 'homework', 'due', 'submit', 'complete', 'required', 'deadline']
        has_assignment = any(kw in combined_text for kw in assignment_keywords)
        
        # PRIORITY 4: Check for important keywords
        important_score = 0
        for keyword in self.important_keywords:
            if keyword in combined_text:
                important_score += 1
        
        # Enhanced classification logic
        # Needs Reply: Strong indicators
        if reply_score >= 3 or (reply_score >= 2 and '?' in combined_text):
            logger.debug(f"Message {message.id} classified as 'needs_reply' (score: {reply_score})")
            return "needs_reply"
        elif has_assignment and reply_score >= 1:
            logger.debug(f"Message {message.id} classified as 'needs_reply' (assignment + reply indicators)")
            return "needs_reply"
        elif reply_score >= 2:
            logger.debug(f"Message {message.id} classified as 'needs_reply' (score: {reply_score})")
            return "needs_reply"
        # Important: Medium priority
        elif important_score >= 2 or (important_score >= 1 and reply_score >= 1):
            logger.debug(f"Message {message.id} classified as 'important' (important_score: {important_score}, reply_score: {reply_score})")
            return "important"
        elif has_assignment:
            logger.debug(f"Message {message.id} classified as 'important' (assignment)")
            return "important"
        elif reply_score >= 1:
            logger.debug(f"Message {message.id} classified as 'important' (reply_score: {reply_score})")
            return "important"
        else:
            # Default to important for safety (user can review)
            logger.debug(f"Message {message.id} classified as 'important' (default)")
            return "important"
    
    def classify_batch(self, messages: List[Message]) -> Dict[str, List[Message]]:
        """
        Classify a batch of messages.
        
        Args:
            messages: List of Message objects to classify
            
        Returns:
            Dictionary with categorized messages:
            {
                "needs_reply": [Message, ...],
                "important": [Message, ...],
                "ignore": [Message, ...]
            }
        """
        categorized = {
            "needs_reply": [],
            "important": [],
            "ignore": []
        }
        
        for message in messages:
            try:
                category = self.classify_message(message)
                
                # Add category to message
                message.category = category
                
                # Add to appropriate category list
                categorized[category].append(message)
                
            except Exception as e:
                logger.error(f"Error classifying message {message.id}: {str(e)}")
                # Default to important on error
                message.category = "important"
                categorized["important"].append(message)
        
        return categorized


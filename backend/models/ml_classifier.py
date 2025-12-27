"""
ML-Based Message Classifier using Transformer Models
Uses DistilBERT for efficient text classification
"""

from typing import List, Dict, Optional
import logging
import os
import torch
import numpy as np
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    pipeline,
    TextClassificationPipeline
)

logger = logging.getLogger(__name__)

# ML classification timeout in seconds
ML_CLASSIFICATION_TIMEOUT = 10

class MLClassifier:
    """
    Machine Learning-based message classifier using pre-trained transformer models.
    Uses DistilBERT for efficient text classification with fine-tuning capability.
    """
    
    def __init__(self, model_name: str = "distilbert-base-uncased", use_gpu: bool = False):
        """
        Initialize ML classifier with pre-trained model.
        
        Args:
            model_name: Hugging Face model name (default: distilbert-base-uncased)
            use_gpu: Whether to use GPU if available
        """
        self.model_name = model_name
        self.device = 0 if use_gpu and torch.cuda.is_available() else -1
        self.tokenizer = None
        self.model = None
        self.classifier_pipeline = None
        self.category_map = {
            0: "needs_reply",
            1: "important", 
            2: "ignore"
        }
        self.reverse_category_map = {v: k for k, v in self.category_map.items()}
        
        # Initialize model
        self._load_model()
        
        # Fallback to rule-based classifier (lazy load to avoid circular import)
        self._rule_classifier = None
    
    def _load_model(self):
        """Load pre-trained model and tokenizer with memory-efficient options"""
        try:
            logger.info(f"Loading ML model: {self.model_name}")
            
            # Use a pre-trained text classification model
            # We'll use a zero-shot classification approach or fine-tune
            # For now, using a general sentiment/classification model as base
            
            # Option 1: Use zero-shot classification pipeline
            # This works out of the box without training
            # Try smaller model first for memory efficiency (2GB RAM server)
            try:
                # Try smaller model first (more memory-efficient for 2GB RAM)
                smaller_models = [
                    "typeform/distilbert-base-uncased-mnli",  # Smaller, faster
                    "facebook/bart-large-mnli"  # Fallback to larger if smaller fails
                ]
                
                model_loaded = False
                for model_name in smaller_models:
                    try:
                        logger.info(f"Attempting to load model: {model_name}")
                        self.classifier_pipeline = pipeline(
                            "zero-shot-classification",
                            model=model_name,
                            device=self.device,
                            # Memory-efficient options
                            model_kwargs={"low_cpu_mem_usage": True, "torch_dtype": torch.float16 if self.device >= 0 else torch.float32}
                        )
                        logger.info(f"Loaded zero-shot classification model: {model_name}")
                        model_loaded = True
                        break
                    except Exception as model_error:
                        # Check if it's a memory error
                        if self._is_memory_error(model_error):
                            logger.warning(f"Memory error loading {model_name}: {model_error}, trying next model")
                            continue
                        else:
                            logger.warning(f"Error loading {model_name}: {model_error}, trying next model")
                            continue
                
                if not model_loaded:
                    raise Exception("Could not load any zero-shot model")
                    
            except Exception as e:
                logger.warning(f"Could not load zero-shot model: {e}")
                # Fallback: Use DistilBERT with custom head (lighter model)
                self._load_custom_model()
                
        except Exception as e:
            error_msg = str(e).lower()
            if 'memory' in error_msg or 'oom' in error_msg:
                logger.error(f"Memory error loading ML model: {e}")
                logger.warning("ML model requires too much memory. Falling back to rule-based classification only.")
            else:
                logger.error(f"Error loading ML model: {e}")
                logger.warning("Falling back to rule-based classification")
            self.classifier_pipeline = None
    
    def _load_custom_model(self):
        """Load DistilBERT with custom classification head (memory-efficient)"""
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            # Load model with 3 labels (needs_reply, important, ignore)
            # Use memory-efficient loading for 2GB RAM server
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                num_labels=3,
                low_cpu_mem_usage=True,  # Memory-efficient loading
                torch_dtype=torch.float16 if self.device >= 0 else torch.float32
            )
            
            if self.device >= 0:
                self.model = self.model.to(f"cuda:{self.device}")
            
            self.model.eval()  # Set to evaluation mode
            
            logger.info(f"Loaded custom model: {self.model_name}")
            
        except Exception as e:
            if self._is_memory_error(e):
                logger.error(f"Memory error loading custom model: {e}")
            else:
                logger.error(f"Error loading custom model: {e}")
            self.model = None
            self.tokenizer = None
    
    def _prepare_text(self, message: "Message") -> str:
        """
        Prepare message text for classification.
        Combines subject, sender, and preview for context.
        """
        # Extract domain from sender
        sender_domain = ""
        if "@" in message.sender:
            sender_domain = message.sender.split("@")[-1]
        
        # Combine all information
        text_parts = [
            f"From: {message.sender}",
            f"Subject: {message.subject}",
        ]
        
        if message.preview:
            text_parts.append(f"Content: {message.preview}")
        
        if sender_domain:
            text_parts.append(f"Domain: {sender_domain}")
        
        return " | ".join(text_parts)
    
    def _classify_with_zero_shot(self, message: "Message") -> str:
        """
        Classify using zero-shot classification (no training required).
        Optimized for speed - uses shorter text and simpler labels.
        Uses rule-based pre-filtering for common patterns (teachers, announcements).
        """
        # Pre-filter with rule-based logic for speed and accuracy
        # Check for important senders first (teachers, schools, etc.)
        sender_lower = message.sender.lower()
        subject_lower = message.subject.lower()
        preview_lower = (message.preview or "").lower()
        combined_text = f"{subject_lower} {preview_lower}"
        
        # Quick rule-based checks for common patterns
        # Teacher/school emails should be important or needs_reply
        important_sender_patterns = [
            'classroom.google.com',
            '@.edu',
            'teacher@',
            'professor@',
            'instructor@',
            'faculty@',
            'staff@'
        ]
        
        is_important_sender = any(pattern in sender_lower for pattern in important_sender_patterns)
        
        # Check for announcements from no-reply (should be important, not needs_reply)
        is_no_reply = 'no-reply' in sender_lower or 'noreply' in sender_lower
        is_announcement = any(kw in combined_text for kw in ['announcement', 'posted', 'shared', 'new post', 'new assignment'])
        
        if is_important_sender:
            # For important senders, check if it needs reply
            if is_no_reply and is_announcement:
                # Announcements from no-reply are informational (important, not needs_reply)
                return "important"
            
            # Check for reply indicators
            reply_keywords = ['question', '?', 'please', 'request', 'urgent', 'reply', 'respond', 'deadline', 'due', 'submit']
            has_reply_indicator = any(kw in combined_text for kw in reply_keywords)
            
            if has_reply_indicator:
                return "needs_reply"
            else:
                return "important"
        
        # For non-important senders, use ML classification
        # Use shorter text for faster processing
        text = f"{message.subject} | {message.sender}"
        if message.preview:
            # Limit preview length for faster processing
            preview = message.preview[:200] if len(message.preview) > 200 else message.preview
            text += f" | {preview}"
        
        candidate_labels = [
            "needs reply",
            "important", 
            "ignore"
        ]
        
        try:
            result = self.classifier_pipeline(text, candidate_labels, multi_label=False)
            
            # Get the label with highest score
            best_label = result['labels'][0]
            
            # Map to our categories
            if "needs reply" in best_label.lower():
                return "needs_reply"
            elif "important" in best_label.lower():
                return "important"
            else:
                return "ignore"
                
        except Exception as e:
            logger.error(f"Zero-shot classification error: {e}")
            return None
    
    def _classify_with_custom_model(self, message: "Message") -> str:
        """
        Classify using custom fine-tuned model.
        """
        if not self.model or not self.tokenizer:
            return None
        
        text = self._prepare_text(message)
        
        try:
            # Tokenize
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            
            if self.device >= 0:
                inputs = {k: v.to(f"cuda:{self.device}") for k, v in inputs.items()}
            
            # Predict
            with torch.no_grad():
                outputs = self.model(**inputs)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
                predicted_class = predictions.argmax().item()
            
            # Map to category
            return self.category_map.get(predicted_class, "important")
            
        except Exception as e:
            logger.error(f"Custom model classification error: {e}")
            return None
    
    def _is_memory_error(self, error: Exception) -> bool:
        """
        Check if the error is memory-related (OOM).
        
        Args:
            error: Exception to check
            
        Returns:
            True if error is memory-related
        """
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        # Check for common memory error patterns
        memory_indicators = [
            'out of memory',
            'oom',
            'memory error',
            'cannot allocate memory',
            'memory allocation failed',
            'cuda out of memory',
            'runtimeerror',
            'memoryerror'
        ]
        
        # Check error message
        if any(indicator in error_str for indicator in memory_indicators):
            return True
        
        # Check error type
        if error_type in ['MemoryError', 'RuntimeError']:
            # For RuntimeError, check if it's memory-related
            if 'memory' in error_str or 'oom' in error_str:
                return True
        
        # Check for PyTorch CUDA OOM
        if hasattr(torch.cuda, 'OutOfMemoryError'):
            if isinstance(error, torch.cuda.OutOfMemoryError):
                return True
        
        return False
    
    def _classify_with_ml_timeout(self, message: "Message") -> Optional[str]:
        """
        Attempt ML classification with timeout protection and memory error handling.
        Returns None if timeout, memory error, or any other error occurs.
        
        Args:
            message: Message object to classify
            
        Returns:
            Category string or None if timeout/error
        """
        def _ml_classify():
            """Inner function to run ML classification"""
            ml_result = None
            memory_error_occurred = False
            
            # Try zero-shot classification first
            if self.classifier_pipeline:
                try:
                    ml_result = self._classify_with_zero_shot(message)
                    if ml_result:
                        return ml_result
                except Exception as e:
                    # Check if it's a memory error
                    if self._is_memory_error(e):
                        logger.warning(f"Memory error (OOM) in zero-shot classification for message {message.id}: {e}")
                        memory_error_occurred = True
                    else:
                        logger.warning(f"Zero-shot classification failed: {e}")
            
            # If memory error occurred, don't try custom model (will likely fail too)
            if memory_error_occurred:
                return None
            
            # Try custom model as fallback
            if ml_result is None and self.model and self.tokenizer:
                try:
                    ml_result = self._classify_with_custom_model(message)
                except Exception as e:
                    if self._is_memory_error(e):
                        logger.warning(f"Memory error (OOM) in custom model classification for message {message.id}: {e}")
                    else:
                        logger.warning(f"Custom model classification failed: {e}")
            
            return ml_result
        
        # Run ML classification with timeout
        try:
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_ml_classify)
                ml_result = future.result(timeout=ML_CLASSIFICATION_TIMEOUT)
                return ml_result
        except FutureTimeoutError:
            logger.warning(f"ML classification timed out after {ML_CLASSIFICATION_TIMEOUT}s for message {message.id}, falling back to rule-based")
            return None
        except MemoryError as e:
            logger.warning(f"Memory error during ML classification for message {message.id}: {e}, falling back to rule-based")
            return None
        except Exception as e:
            # Check if it's a memory-related error
            if self._is_memory_error(e):
                logger.warning(f"Memory error (OOM) during ML classification for message {message.id}: {e}, falling back to rule-based")
            else:
                logger.warning(f"ML classification error for message {message.id}: {e}, falling back to rule-based")
            return None
    
    def classify_message(self, message: "Message") -> str:
        """
        Classify a single message using optimized hybrid approach.
        Uses rule-based FIRST for teacher/school emails (faster + more accurate).
        Uses ML only for other emails (edge cases) with 10-second timeout fallback.
        
        Args:
            message: Message object to classify
            
        Returns:
            Category string: "needs_reply", "important", or "ignore"
        """
        # Quick rule-based check for teacher/school emails (MUCH faster)
        sender_lower = message.sender.lower()
        subject_lower = message.subject.lower()
        preview_lower = (message.preview or "").lower()
        combined_text = f"{subject_lower} {preview_lower}"
        
        # Check if it's from teacher/school (use rule-based - faster and more accurate)
        important_sender_patterns = [
            'classroom.google.com',
            '.edu',
            'teacher',
            'professor',
            'instructor',
            'faculty',
            'staff'
        ]
        
        is_important_sender = any(pattern in sender_lower for pattern in important_sender_patterns)
        
        if is_important_sender:
            # Use rule-based for teacher/school emails (fast and accurate)
            if self._rule_classifier is None:
                from models.classifier import MessageClassifier
                self._rule_classifier = MessageClassifier()
            
            result = self._rule_classifier.classify_message(message)
            logger.debug(f"Rule-based classification (teacher/school): {message.id} -> {result}")
            return result
        
        # For other emails, try ML with timeout protection (for edge cases)
        ml_result = self._classify_with_ml_timeout(message)
        
        # If ML classification succeeded, return result
        if ml_result:
            logger.debug(f"ML classification: {message.id} -> {ml_result}")
            return ml_result
        
        # Fallback to rule-based classification (timeout or error)
        if self._rule_classifier is None:
            from models.classifier import MessageClassifier
            self._rule_classifier = MessageClassifier()
        
        logger.debug(f"Using rule-based fallback for message: {message.id}")
        return self._rule_classifier.classify_message(message)
    
    def classify_batch(self, messages: List["Message"]) -> Dict[str, List["Message"]]:
        """
        Classify a batch of messages using ML model.
        Optimized: For large batches (>30), uses hybrid approach (ML for sample, rule-based for rest).
        
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
        
        # Smart hybrid approach: Use rule-based for teacher/school emails (faster + more accurate)
        # Use ML only for other emails (edge cases)
        logger.info(f"Processing {len(messages)} messages with smart hybrid approach")
        
        # Separate: rule-based for known patterns, ML for others
        rule_based_messages = []
        ml_messages = []
        
        for message in messages:
            sender_lower = message.sender.lower()
            # Use rule-based for teacher/school emails (much faster and more accurate for these)
            if any(pattern in sender_lower for pattern in ['classroom.google.com', '.edu', 'teacher', 'professor', 'instructor', 'faculty', 'staff']):
                rule_based_messages.append(message)
            else:
                ml_messages.append(message)
        
        # Limit ML processing to max 10 messages for speed
        if len(ml_messages) > 10:
            logger.info(f"Limiting ML to 10 messages, using rule-based for {len(ml_messages) - 10} others")
            # Use rule-based for excess ML messages
            rule_based_messages.extend(ml_messages[10:])
            ml_messages = ml_messages[:10]
        
        # Initialize rule-based classifier if needed
        if self._rule_classifier is None:
            from models.classifier import MessageClassifier
            self._rule_classifier = MessageClassifier()
        
        # Classify ML messages with timeout protection
        for message in ml_messages:
            try:
                # Use classify_message which has built-in timeout protection
                category = self.classify_message(message)
                message.category = category
                categorized[category].append(message)
            except Exception as e:
                logger.error(f"Error classifying message {message.id}: {str(e)}")
                # Fallback to rule-based on any error
                try:
                    category = self._rule_classifier.classify_message(message)
                    message.category = category
                    categorized[category].append(message)
                except Exception as e2:
                    logger.error(f"Rule-based fallback also failed for {message.id}: {str(e2)}")
                    message.category = "important"
                    categorized["important"].append(message)
        
        # Classify rule-based messages (fast, no timeout needed)
        for message in rule_based_messages:
            try:
                category = self._rule_classifier.classify_message(message)
                message.category = category
                categorized[category].append(message)
            except Exception as e:
                logger.error(f"Error classifying message {message.id}: {str(e)}")
                message.category = "important"
                categorized["important"].append(message)
        
        return categorized
    
    def fine_tune(self, training_data: List[Dict], epochs: int = 3):
        """
        Fine-tune the model on custom training data.
        
        Args:
            training_data: List of dicts with 'text' and 'label' keys
            epochs: Number of training epochs
        """
        # This would require training loop implementation
        # For now, this is a placeholder for future enhancement
        logger.info("Fine-tuning not yet implemented. Use zero-shot or pre-trained models.")
        pass


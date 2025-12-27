"""
Model Learning System - Improves ML classifier precision over time
Collects user feedback and uses it to fine-tune the model
"""

import json
import logging
import os
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

class ModelLearningSystem:
    """
    System to collect user feedback and improve model precision over time.
    """
    
    def __init__(self, feedback_file: str = "model_feedback.json"):
        """
        Initialize the learning system.
        
        Args:
            feedback_file: Path to store user feedback data
        """
        self.feedback_file = feedback_file
        self.feedback_data = self._load_feedback()
    
    def _load_feedback(self) -> Dict:
        """Load existing feedback data"""
        feedback_path = Path(self.feedback_file)
        
        if feedback_path.exists():
            try:
                with open(feedback_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading feedback: {e}")
                return {"corrections": [], "statistics": {}}
        
        return {"corrections": [], "statistics": {}}
    
    def _save_feedback(self):
        """Save feedback data to file"""
        try:
            feedback_path = Path(self.feedback_file)
            feedback_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(feedback_path, 'w', encoding='utf-8') as f:
                json.dump(self.feedback_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving feedback: {e}")
    
    def record_correction(
        self,
        message_id: str,
        predicted_category: str,
        correct_category: str,
        message_data: Dict
    ):
        """
        Record a user correction to improve the model.
        
        Args:
            message_id: Unique message identifier
            predicted_category: What the model predicted
            correct_category: What the user says is correct
            message_data: Full message data (subject, sender, preview, etc.)
        """
        correction = {
            "message_id": message_id,
            "timestamp": datetime.utcnow().isoformat(),
            "predicted": predicted_category,
            "correct": correct_category,
            "message": {
                "subject": message_data.get("subject", ""),
                "sender": message_data.get("sender", ""),
                "preview": message_data.get("preview", "")
            }
        }
        
        self.feedback_data["corrections"].append(correction)
        
        # Update statistics
        if "statistics" not in self.feedback_data:
            self.feedback_data["statistics"] = {}
        
        stats = self.feedback_data["statistics"]
        key = f"{predicted_category}_to_{correct_category}"
        stats[key] = stats.get(key, 0) + 1
        
        # Save feedback
        self._save_feedback()
        
        logger.info(f"Recorded correction: {predicted_category} -> {correct_category} for message {message_id}")
    
    def get_feedback_statistics(self) -> Dict:
        """Get statistics about corrections"""
        return self.feedback_data.get("statistics", {})
    
    def get_training_data(self, min_corrections: int = 10) -> Optional[List[Dict]]:
        """
        Get training data from corrections (for fine-tuning).
        
        Args:
            min_corrections: Minimum number of corrections needed
            
        Returns:
            List of training examples or None if not enough data
        """
        corrections = self.feedback_data.get("corrections", [])
        
        if len(corrections) < min_corrections:
            logger.info(f"Not enough corrections for training: {len(corrections)}/{min_corrections}")
            return None
        
        # Convert corrections to training format
        training_data = []
        for correction in corrections:
            message = correction["message"]
            text = f"{message['subject']} | {message['sender']} | {message['preview']}"
            
            training_data.append({
                "text": text,
                "label": correction["correct"],
                "original_prediction": correction["predicted"]
            })
        
        return training_data
    
    def analyze_common_mistakes(self) -> Dict:
        """
        Analyze common classification mistakes to identify patterns.
        
        Returns:
            Dictionary with mistake patterns and suggestions
        """
        corrections = self.feedback_data.get("corrections", [])
        
        if not corrections:
            return {"message": "No corrections recorded yet"}
        
        # Count mistake patterns
        mistake_patterns = {}
        
        for correction in corrections:
            pattern = f"{correction['predicted']} -> {correction['correct']}"
            if pattern not in mistake_patterns:
                mistake_patterns[pattern] = {
                    "count": 0,
                    "examples": []
                }
            
            mistake_patterns[pattern]["count"] += 1
            if len(mistake_patterns[pattern]["examples"]) < 5:
                mistake_patterns[pattern]["examples"].append({
                    "subject": correction["message"]["subject"],
                    "sender": correction["message"]["sender"]
                })
        
        # Sort by frequency
        sorted_patterns = sorted(
            mistake_patterns.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )
        
        return {
            "total_corrections": len(corrections),
            "common_mistakes": dict(sorted_patterns[:10]),  # Top 10
            "suggestions": self._generate_suggestions(mistake_patterns)
        }
    
    def _generate_suggestions(self, mistake_patterns: Dict) -> List[str]:
        """Generate suggestions based on mistake patterns"""
        suggestions = []
        
        # Check for common patterns
        if "ignore -> important" in mistake_patterns:
            count = mistake_patterns["ignore -> important"]["count"]
            if count > 5:
                suggestions.append(
                    f"Model is ignoring {count} important messages. "
                    "Consider improving 'ignore' classification rules."
                )
        
        if "important -> needs_reply" in mistake_patterns:
            count = mistake_patterns["important -> needs_reply"]["count"]
            if count > 5:
                suggestions.append(
                    f"Model is marking {count} messages as 'important' when they need replies. "
                    "Consider improving reply detection."
                )
        
        return suggestions
    
    def get_accuracy_estimate(self) -> Dict:
        """
        Estimate model accuracy based on corrections.
        
        Returns:
            Dictionary with accuracy metrics
        """
        corrections = self.feedback_data.get("corrections", [])
        
        if not corrections:
            return {
                "accuracy_estimate": None,
                "message": "Not enough data. Need user corrections to estimate accuracy."
            }
        
        # Calculate accuracy (assuming recent corrections are more representative)
        recent_corrections = corrections[-50:]  # Last 50 corrections
        
        total = len(recent_corrections)
        correct = sum(1 for c in recent_corrections if c["predicted"] == c["correct"])
        
        accuracy = (correct / total) * 100 if total > 0 else 0
        
        return {
            "accuracy_estimate": round(accuracy, 2),
            "total_corrections": len(corrections),
            "recent_corrections": total,
            "correct_predictions": correct,
            "incorrect_predictions": total - correct
        }


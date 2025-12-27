"""
Models package for Smart Message Organizer
"""

from .classifier import MessageClassifier, Message
from .ml_classifier import MLClassifier

__all__ = ["MessageClassifier", "MLClassifier", "Message"]

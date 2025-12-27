"""
Smart Message Organizer - FastAPI Backend
Phase 4: Backend API for message classification
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
import logging
import time
from datetime import datetime

# Import classifiers
# Note: MessageClassifier is kept as fallback for ML classifier
from models.classifier import MessageClassifier, Message as ClassifierMessage
from models.ml_classifier import MLClassifier
from models.model_learning import ModelLearningSystem
from models.ai_insights import AIInsightsGenerator
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Smart Message Organizer API",
    description="AI-powered Gmail message classification API",
    version="1.0.0"
)

# CORS Configuration
# Allow Chrome extension origins
# For IIS deployment, you may need to specify exact origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],  # In production, specify exact extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize classifier
# Use ML classifier if enabled, otherwise use rule-based
USE_ML_CLASSIFIER = os.getenv("USE_ML_CLASSIFIER", "true").lower() == "true"

if USE_ML_CLASSIFIER:
    try:
        logger.info("Initializing ML-based classifier...")
        classifier = MLClassifier(use_gpu=os.getenv("USE_GPU", "false").lower() == "true")
        logger.info("ML classifier initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize ML classifier: {e}")
        logger.warning("Falling back to rule-based classifier")
        classifier = MessageClassifier()
else:
    logger.info("Using rule-based classifier")
    classifier = MessageClassifier()

# Initialize learning system for model improvement
learning_system = ModelLearningSystem(feedback_file="backend/model_feedback.json")
logger.info("Model learning system initialized")

# Initialize AI insights generator
USE_AI_INSIGHTS = os.getenv("USE_AI_INSIGHTS", "true").lower() == "true"
ai_insights = AIInsightsGenerator(use_ai=USE_AI_INSIGHTS)
logger.info(f"AI insights generator initialized (use_ai={USE_AI_INSIGHTS})")

# ============================================================================
# Data Models
# ============================================================================

class Message(BaseModel):
    """Message model for classification"""
    id: str = Field(..., description="Unique message identifier")
    subject: str = Field(..., min_length=1, max_length=500, description="Email subject line")
    sender: str = Field(..., min_length=1, max_length=200, description="Sender email or name")
    preview: str = Field(default="", max_length=1000, description="Email preview/snippet")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    category: Optional[str] = Field(None, description="Assigned category")
    
    @field_validator('subject', 'sender')
    @classmethod
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()

class ClassificationRequest(BaseModel):
    """Request model for message classification"""
    messages: List[Message] = Field(..., min_length=1, max_length=100, description="List of messages to classify")
    
    @field_validator('messages')
    @classmethod
    def validate_messages(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one message is required')
        if len(v) > 100:
            raise ValueError('Maximum 100 messages allowed per request')
        return v

class CategorizedMessages(BaseModel):
    """Categorized messages response"""
    needs_reply: List[Message] = Field(default_factory=list)
    important: List[Message] = Field(default_factory=list)
    ignore: List[Message] = Field(default_factory=list)

class ClassificationResponse(BaseModel):
    """Response model for classification"""
    success: bool = True
    categorized: CategorizedMessages
    total: int
    processed_at: str
    processing_time_ms: float
    insights: Optional[List[Dict[str, Any]]] = Field(default=None, description="AI-generated insights and recommendations")

class ErrorResponse(BaseModel):
    """Error response model"""
    error: bool = True
    message: str
    code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class CorrectionRequest(BaseModel):
    """Request model for user corrections"""
    message_id: str
    predicted_category: str
    correct_category: str
    message: Message

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": "Smart Message Organizer API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "classify": "/classify"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Smart Message Organizer API"
    }

@app.post("/classify", response_model=ClassificationResponse)
async def classify_messages(request: ClassificationRequest):
    """
    Classify messages into categories: needs_reply, important, ignore
    
    Args:
        request: ClassificationRequest containing list of messages
        
    Returns:
        ClassificationResponse with categorized messages
    """
    start_time = time.time()
    
    try:
        logger.info(f"Received classification request for {len(request.messages)} messages")
        logger.info(f"Starting ML classification - this may take 30-60 seconds for {len(request.messages)} messages...")
        
        # Validate request
        if not request.messages:
            raise HTTPException(
                status_code=400,
                detail="No messages provided"
            )
        
        # Convert Pydantic models to classifier format
        classifier_messages = [
            ClassifierMessage(
                id=msg.id,
                subject=msg.subject,
                sender=msg.sender,
                preview=msg.preview,
                timestamp=msg.timestamp
            )
            for msg in request.messages
        ]
        
        # Classify messages
        categorized = classifier.classify_batch(classifier_messages)
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Convert classifier messages back to API Message format
        def convert_to_api_message(msg):
            return Message(
                id=msg.id,
                subject=msg.subject,
                sender=msg.sender,
                preview=msg.preview,
                timestamp=msg.timestamp,
                category=msg.category
            )
        
        # Generate AI insights
        insights = None
        try:
            insights = ai_insights.generate_insights({
                "categorized": {
                    "needs_reply": [{"id": msg.id, "subject": msg.subject, "sender": msg.sender, "preview": msg.preview} for msg in categorized["needs_reply"]],
                    "important": [{"id": msg.id, "subject": msg.subject, "sender": msg.sender, "preview": msg.preview} for msg in categorized["important"]],
                    "ignore": [{"id": msg.id, "subject": msg.subject, "sender": msg.sender, "preview": msg.preview} for msg in categorized["ignore"]]
                },
                "total": len(request.messages)
            })
            logger.info(f"Generated {len(insights) if insights else 0} AI insights")
        except Exception as e:
            logger.warning(f"Error generating AI insights: {e}")
            # Continue without insights - frontend will use rule-based fallback
        
        # Prepare response
        response = ClassificationResponse(
            success=True,
            categorized=CategorizedMessages(
                needs_reply=[convert_to_api_message(msg) for msg in categorized["needs_reply"]],
                important=[convert_to_api_message(msg) for msg in categorized["important"]],
                ignore=[convert_to_api_message(msg) for msg in categorized["ignore"]]
            ),
            total=len(request.messages),
            processed_at=datetime.utcnow().isoformat(),
            processing_time_ms=round(processing_time, 2),
            insights=insights
        )
        
        logger.info(
            f"Classification complete: "
            f"needs_reply={len(response.categorized.needs_reply)}, "
            f"important={len(response.categorized.important)}, "
            f"ignore={len(response.categorized.ignore)}, "
            f"time={processing_time:.2f}ms"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error classifying messages: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=True,
            message=exc.detail,
            code=f"HTTP_{exc.status_code}"
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """General exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error=True,
            message="Internal server error",
            code="INTERNAL_ERROR"
        ).dict()
    )

# ============================================================================
# Startup Event
# ============================================================================

@app.post("/correction")
async def record_correction(request: CorrectionRequest):
    """
    Record a user correction to improve model precision.
    This allows the model to learn from user feedback.
    """
    try:
        learning_system.record_correction(
            message_id=request.message_id,
            predicted_category=request.predicted_category,
            correct_category=request.correct_category,
            message_data={
                "subject": request.message.subject,
                "sender": request.message.sender,
                "preview": request.message.preview
            }
        )
        
        return {
            "success": True,
            "message": "Correction recorded. Model will improve over time.",
            "total_corrections": len(learning_system.feedback_data.get("corrections", []))
        }
    except Exception as e:
        logger.error(f"Error recording correction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-stats")
async def get_model_statistics():
    """Get model statistics and learning progress"""
    try:
        stats = learning_system.get_accuracy_estimate()
        mistakes = learning_system.analyze_common_mistakes()
        
        return {
            "success": True,
            "accuracy": stats,
            "common_mistakes": mistakes,
            "feedback_statistics": learning_system.get_feedback_statistics()
        }
    except Exception as e:
        logger.error(f"Error getting model stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Smart Message Organizer API starting up...")
    logger.info("Classifier initialized and ready")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Smart Message Organizer API shutting down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


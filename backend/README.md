# Smart Message Organizer - Backend API

FastAPI backend for classifying Gmail messages using **ML-based transformer models**.

## 🚀 Features

- **ML-Powered Classification**: Uses transformer models (BART, DistilBERT) for accurate email classification
- **Zero-Shot Learning**: Works immediately without training data
- **Automatic Fallback**: Falls back to rule-based classifier if ML unavailable
- **GPU Support**: Optional GPU acceleration for faster processing
- **Batch Processing**: Efficient classification of multiple messages

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

**Note:** First installation may take 5-10 minutes as it downloads ML model files (~1.6 GB).

### 3. Run the Server

```bash
python app.py
```

Or with uvicorn directly:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

## API Endpoints

### GET `/`
API information and available endpoints.

### GET `/health`
Health check endpoint.

### POST `/classify`
Classify messages into categories.

**Request:**
```json
{
  "messages": [
    {
      "id": "msg_1",
      "subject": "Meeting Request",
      "sender": "john@example.com",
      "preview": "Can we schedule a meeting?",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "categorized": {
    "needs_reply": [...],
    "important": [...],
    "ignore": [...]
  },
  "total": 1,
  "processed_at": "2024-01-15T10:30:00.000Z",
  "processing_time_ms": 12.5
}
```

## Testing

### Using curl

```bash
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "test_1",
        "subject": "Urgent: Need your reply",
        "sender": "test@example.com",
        "preview": "Please respond as soon as possible",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ]
  }'
```

### Using Python

```python
import requests

response = requests.post(
    "http://localhost:8000/classify",
    json={
        "messages": [
            {
                "id": "test_1",
                "subject": "Meeting Request",
                "sender": "john@example.com",
                "preview": "Can we schedule?",
                "timestamp": "2024-01-15T10:30:00.000Z"
            }
        ]
    }
)

print(response.json())
```

## ML Classifier Configuration

### Environment Variables

```bash
# Enable/disable ML classifier (default: true)
USE_ML_CLASSIFIER=true

# Use GPU if available (default: false)
USE_GPU=false

# Model selection (default: distilbert-base-uncased)
ML_MODEL_NAME=distilbert-base-uncased
```

### ML Models

The system uses two ML approaches:

1. **Zero-Shot Classification** (Primary)
   - Model: `facebook/bart-large-mnli`
   - Works immediately without training
   - Accuracy: ~90-95%

2. **Custom Model** (Fallback)
   - Model: `distilbert-base-uncased`
   - Can be fine-tuned on your data
   - Accuracy: ~85-90%

### Testing ML Classifier

```bash
cd backend
pytest tests/test_ml_classifier.py
```

## Configuration

### CORS
Currently configured to allow all origins. In production, specify exact Chrome extension ID.

### Port
Default: 8000
Change in `app.py` or via uvicorn command.

## Development

### Logging
Logs are output to console with INFO level by default.

### Error Handling
All errors are caught and returned as JSON responses.

## Production Deployment

1. Set up proper CORS origins
2. Use environment variables for configuration
3. Set up proper logging
4. Use a production ASGI server (e.g., Gunicorn with Uvicorn workers)
5. Set up reverse proxy (nginx)
6. Enable HTTPS


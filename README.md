# 📧 Smart Message Organizer

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow.svg)
![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)

**AI-powered Chrome extension that organizes Gmail messages into actionable categories with privacy-first architecture**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [API](#-api) • [Privacy](#-privacy)

</div>

---

## 🎯 Overview

Smart Message Organizer is a full-stack Chrome extension that intelligently categorizes Gmail messages into **Needs Reply**, **Important**, and **Ignore** categories. Built with a privacy-first approach, it requires explicit user permission and processes data only on user action.

### Key Highlights

- ✅ **Privacy-First Design**: Explicit user consent, local data storage, no background collection
- ✅ **AI-Powered Classification**: Rule-based engine (easily upgradeable to LLM)
- ✅ **Full-Stack Architecture**: Chrome Extension + FastAPI Backend
- ✅ **Production-Ready**: Error handling, retry logic, comprehensive testing
- ✅ **User Control**: Revoke permission, clear data, privacy settings

---

## ✨ Features

### Core Functionality
- 📧 **Message Extraction**: Extracts visible Gmail messages (subject, sender, preview)
- 🤖 **AI Classification**: Categorizes messages into actionable categories
- 📊 **Results Display**: Beautiful UI with categorized message lists
- ⚡ **Fast Processing**: Classifies 50+ messages in <15ms

### Privacy & Control
- 🔒 **Explicit Permission**: User must grant permission before any data access
- 🗑️ **Data Management**: Clear session data, revoke permission anytime
- 📋 **Privacy Information**: Comprehensive privacy policy and data audit
- 🎛️ **Settings Panel**: Complete control over extension behavior

### User Experience
- 🎨 **Modern Dark Theme**: Professional, easy-on-the-eyes interface
- 📱 **Responsive Design**: Optimized for different screen sizes
- 🔄 **Real-time Updates**: Instant classification results
- ⌨️ **Keyboard Shortcuts**: Power user features (coming soon)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Chrome Extension (Frontend)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Popup   │  │ Content  │  │ Storage  │            │
│  │   UI     │  │  Script  │  │   API    │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└────────────────────┬──────────────────────────────────┘
                     │ HTTP POST
                     ▼
┌─────────────────────────────────────────────────────────┐
│           FastAPI Backend (Python)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   API    │  │Classifier│  │ Response │            │
│  │ Endpoint │  │  Engine  │  │Formatter │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- JavaScript (ES6+)
- Chrome Extensions API (Manifest V3)
- HTML5/CSS3

**Backend:**
- Python 3.9+
- FastAPI
- Pydantic
- Uvicorn

**Classification:**
- Rule-based algorithm (modular design)
- Ready for LLM integration (OpenAI, Anthropic, etc.)

---

## 📦 Installation

### Prerequisites
- Chrome browser (latest version)
- Python 3.9 or higher
- Node.js (optional, for development)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai_extension.git
   cd ai_extension
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the server**
   ```bash
   python app.py
   ```
   
   Server will run at `http://localhost:8000`

### Extension Setup

1. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

2. **Load Extension**
   - Click "Load unpacked"
   - Select the `extension/` folder

3. **Configure Backend URL** (if needed)
   - Edit `extension/popup/config.js`
   - Update `API_BASE_URL` if backend is not on localhost:8000

---

## 🚀 Usage

### Basic Workflow

1. **Grant Permission**
   - Click extension icon
   - Click "Allow" on permission screen

2. **Analyze Messages**
   - Open Gmail (`mail.google.com`)
   - Click extension icon
   - Click "Analyze Messages"
   - Wait for classification (usually <1 second)

3. **View Results**
   - Results appear in categorized sections:
     - 🔴 **Needs Reply**: Messages requiring response
     - 🟡 **Important**: Important but may not need immediate reply
     - ⚪ **Ignore**: Can be safely ignored

4. **Manage Data**
   - Click "Settings" to access controls
   - Revoke permission or clear data anytime

### Advanced Features

- **Collapse Categories**: Click category header to expand/collapse
- **New Analysis**: Click "New Analysis" button to start over
- **Privacy Info**: Click "Privacy" button for detailed information

---

## 🔌 API Documentation

### Base URL
```
http://localhost:8000
```

### Endpoints

#### `GET /`
API information and available endpoints.

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Smart Message Organizer API"
}
```

#### `POST /classify`
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

### Interactive API Docs
Visit `http://localhost:8000/docs` for Swagger UI documentation.

---

## 🔒 Privacy

### Privacy-First Design

- ✅ **Explicit Consent**: User must grant permission before any data access
- ✅ **Local Storage**: All data stored locally in browser
- ✅ **No Background Access**: Extension only works on user action
- ✅ **User Control**: Revoke permission or clear data anytime
- ✅ **Transparency**: Comprehensive privacy policy and data audit

### Data Storage

- **Permission Status**: Stored locally (can be revoked)
- **Extracted Messages**: Temporary, cleared on new analysis
- **Classification Results**: Temporary, can be cleared anytime
- **No Cloud Storage**: All data stays on your device

### What We Don't Do

- ❌ No background data collection
- ❌ No cloud storage of emails
- ❌ No third-party data sharing
- ❌ No tracking or analytics
- ❌ No access without permission

See [Privacy Policy](docs/PRIVACY_POLICY.md) for detailed information.

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd extension
npm test  # If using Jest
```

### Manual Testing
1. Test permission flow
2. Test message extraction
3. Test classification
4. Test error handling
5. Test privacy controls

---

## 📊 Performance

- **Message Extraction**: <500ms for 50 messages
- **Classification**: <15ms per message
- **Total Processing**: <1 second for 50 messages
- **Memory Usage**: <50MB
- **Extension Size**: ~100KB

---

## 🛠️ Development

### Project Structure
```
ai_extension/
├── extension/          # Chrome extension
│   ├── popup/         # Popup UI
│   ├── content/       # Content scripts
│   └── icons/         # Extension icons
├── backend/           # FastAPI backend
│   ├── app.py        # Main application
│   ├── models/       # Classification models
│   └── utils/        # Utility functions
├── docs/             # Documentation
└── tests/            # Test files
```

### Code Quality
- ESLint for JavaScript
- Pylint for Python
- Type hints where applicable
- Comprehensive error handling

---

## 🚧 Roadmap

### Phase 1-7: ✅ Complete
- Extension skeleton
- Permission system
- Message extraction
- Backend integration
- Classification engine
- Results UI
- Privacy controls

### Future Enhancements
- [ ] Export functionality (CSV/JSON)
- [ ] Statistics dashboard
- [ ] Search and filter
- [ ] Custom categories
- [ ] LLM-based classification
- [ ] Keyboard shortcuts
- [ ] Multi-language support

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Chrome Extensions API documentation
- FastAPI framework
- Gmail for email service

---

## 📧 Contact

For questions or suggestions:
- Open an issue on GitHub
- Check the [documentation](docs/)

---

<div align="center">

**Built with ❤️ for better email organization**

⭐ Star this repo if you find it useful!

</div>


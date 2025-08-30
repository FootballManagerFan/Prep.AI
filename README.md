# Prep.AI - AI-Powered Interview Preparation Tool

## Overview
Prep.AI is a comprehensive interview preparation platform that uses AI to conduct realistic technical interviews. The system combines resume analysis, speech-to-text transcription, and AI-generated questions to create an interactive interview experience.

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla HTML/CSS/JavaScript with Tailwind CSS
- **AI Services**: OpenAI GPT-3.5-turbo for interview questions
- **Speech Processing**: Google Cloud Speech-to-Text API
- **File Storage**: Google Cloud Storage (for large audio files)
- **PDF Processing**: pdf-parse library
- **File Uploads**: Multer middleware

### Project Structure
```
Prep.AI/
├── index.js                    # Main server entry point
├── src/
│   ├── server/                 # Backend server code
│   │   ├── index.js            # Express server and API endpoints
│   │   ├── routes/             # API route handlers (planned)
│   │   ├── middleware/         # Custom middleware (planned)
│   │   ├── services/           # Business logic services (planned)
│   │   └── utils/              # Utility functions (planned)
│   ├── public/                 # Frontend assets
│   │   ├── index.html          # Home page with test selection
│   │   ├── test-page.html      # Testing interface
│   │   ├── js/                 # JavaScript files
│   │   │   └── script.js       # Frontend logic
│   │   ├── css/                # Stylesheets (planned)
│   │   └── assets/             # Images, icons, etc. (planned)
│   └── config/                 # Configuration files
│       └── config.js           # Environment and app configuration
├── uploads/                    # Temporary file storage
├── googenv.json                # Google Cloud credentials
├── package.json                # Dependencies and scripts
└── tickets.MD                  # Development roadmap and tasks
```

## 🚀 Core Features

### 1. Resume Analysis
- PDF upload and text extraction
- AI-powered question generation based on resume content
- Context-aware interview flow

### 2. Speech-to-Text Processing
- Real-time audio recording and transcription
- Support for WEBM_OPUS format
- Automatic fallback to Google Cloud Storage for large files

### 3. AI Interviewer
- Dynamic question generation based on candidate responses
- Resume context integration
- Industry-specific interview models (planned)

### 4. File Management
- Automatic cleanup of uploaded files
- Temporary storage management
- Resume context reset functionality

## 📡 API Endpoints

### Core Endpoints

#### `POST /upload-resume`
- **Purpose**: Upload and process PDF resume
- **Input**: Multipart form with 'resume' field (PDF file)
- **Output**: JSON with initial AI-generated question
- **Features**: 
  - PDF text extraction
  - AI question generation
  - Automatic file cleanup
  - Resume context storage

#### `POST /upload`
- **Purpose**: Process audio responses and generate follow-up questions
- **Input**: Multipart form with 'audio' field (WEBM audio)
- **Output**: JSON with transcription and next question
- **Features**:
  - Speech-to-text conversion
  - Context-aware question generation
  - Large file handling via GCS

#### `POST /reset-resume`
- **Purpose**: Clear stored resume context
- **Output**: Success confirmation

#### `POST /clean-uploads`
- **Purpose**: Clean all files in uploads directory
- **Output**: Number of files removed

### Utility Endpoints

#### `GET /test-pdf`
- **Purpose**: Verify PDF parser functionality
- **Output**: Parser status and availability

## 🔧 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Google Cloud Platform account
- OpenAI API key

### 1. Clone and Install
```bash
git clone <repository-url>
cd Prep.AI
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
SESSION_SECRET=your_session_secret_here
PORT=3000
```

### 3. Google Cloud Setup
- Download your Google Cloud service account key
- Rename it to `googenv.json`
- Place it in the project root
- Ensure the service account has Speech-to-Text and Storage permissions

### 4. Start Development Server
```bash
npm run dev
```
Server runs on `http://localhost:3000`

## 🎯 Development Workflow

### Current Development State
- ✅ Basic interview flow implemented
- ✅ Resume upload and processing
- ✅ Audio transcription
- ✅ AI question generation
- ✅ File cleanup system
- ✅ New src folder structure
- ✅ Home page with test selection

### Planned Features (from tickets.MD)
- 🔄 Response streaming for faster AI responses
- 📊 Industry-specific interview models (Marketing, Programming, Quant, Trading)
- 🗣️ Text-to-speech with ElevenLabs
- 🏗️ Code refactoring and folder structure improvements
- 🔐 Authentication and user management
- ⚡ React/Next.js migration

### Development Guidelines
1. **File Organization**: Keep related functionality together in src folders
2. **Error Handling**: Implement comprehensive error handling for all endpoints
3. **File Cleanup**: Always clean up uploaded files after processing
4. **API Consistency**: Maintain consistent JSON response format
5. **Security**: Validate file types and implement proper input sanitization

## 🧪 Testing

### Manual Testing
- Use the home page at `http://localhost:3000`
- Navigate to testing interface at `http://localhost:3000/test`
- Test PDF upload with sample resumes
- Test audio recording and transcription
- Verify file cleanup functionality

### API Testing
- Test all endpoints with Postman or similar tools
- Verify error handling with invalid inputs
- Check file size limits and format restrictions

## 📁 File Management

### Uploads Directory
- **Purpose**: Temporary storage for uploaded files
- **Cleanup**: Automatic cleanup after processing
- **Manual Cleanup**: Use `/clean-uploads` endpoint
- **File Types**: PDF (resume), WEBM (audio)

### Google Cloud Storage
- **Purpose**: Handle large audio files (>60 seconds)
- **Bucket**: `prepai_bucket`
- **Cleanup**: Automatic deletion after transcription

## 🔒 Security Considerations

### Current Implementation
- File type validation (PDF for resume, audio for responses)
- Automatic file cleanup to prevent storage buildup
- No persistent storage of sensitive data

### Recommended Improvements
- File size limits
- Input sanitization
- Rate limiting
- User authentication
- HTTPS enforcement

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Considerations
- Environment variable management
- HTTPS configuration
- File storage optimization
- Monitoring and logging
- Backup strategies

## 🤝 Contributing

### Development Process
1. Check `tickets.MD` for current priorities
2. Create feature branches for new development
3. Implement comprehensive error handling
4. Test all endpoints thoroughly
5. Update documentation as needed

### Code Standards
- Use ES6+ features
- Implement proper error handling
- Add logging for debugging
- Follow existing code patterns
- Document new endpoints

## 📚 Additional Resources

- **Google Cloud Speech-to-Text**: [Documentation](https://cloud.google.com/speech-to-text)
- **OpenAI API**: [Documentation](https://platform.openai.com/docs)
- **Express.js**: [Documentation](https://expressjs.com/)
- **Multer**: [Documentation](https://github.com/expressjs/multer)

## 🐛 Troubleshooting

### Common Issues
1. **Google Cloud credentials**: Ensure `googenv.json` is properly configured
2. **OpenAI API**: Verify API key in `.env` file
3. **File uploads**: Check uploads directory permissions
4. **Audio processing**: Verify audio format (WEBM_OPUS)

### Debug Endpoints
- `/test-pdf`: Verify PDF parser functionality
- Check server console for detailed error logs

---

**Note**: This codebase is actively developed. Check `tickets.MD` for the latest development priorities and planned features. 

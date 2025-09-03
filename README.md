# Prep.AI - AI-Powered Interview Preparation Platform

## 🎯 Overview
Prep.AI is a comprehensive interview preparation platform that uses AI to conduct realistic technical interviews. The system combines resume analysis, speech-to-text transcription, AI-generated questions, and an integrated code editor to create an interactive interview experience across multiple domains.

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla HTML/CSS/JavaScript with Tailwind CSS
- **Code Editor**: Monaco Editor (VS Code engine)
- **AI Services**: OpenAI GPT-3.5-turbo for interview questions and code analysis
- **Speech Processing**: Google Cloud Speech-to-Text API
- **File Storage**: Google Cloud Storage (for large audio files)
- **PDF Processing**: pdf-parse library for resume analysis
- **File Uploads**: Multer middleware

### Project Structure
```
Prep.AI/
├── index.js                    # Main server entry point
├── src/
│   ├── public/                 # Frontend pages
│   │   ├── index.html          # Landing page with test categories
│   │   ├── test-page.html      # IDE-integrated testing interface
│   │   └── js/                 # JavaScript modules
│   │       ├── script.js       # Main interview logic
│   │       └── shared.js       # Shared utilities
│   ├── server/                 # Backend server code (planned)
│   └── config/                 # Configuration files (planned)
├── public/                     # Static assets
│   └── script.js               # Legacy interview script
├── backend/                    # Separate backend services
│   └── database/               # Database configurations
├── uploads/                    # Temporary file storage
├── temp/                       # Code execution temporary files
├── googenv.json                # Google Cloud service account key (not in repo)
├── package.json                # Dependencies and scripts
├── tickets.MD                  # Development roadmap and tasks
├── design.md                   # UI/UX design notes
├── HOSTING_PLAN.md            # Deployment and hosting strategy
└── notes.md                   # Development notes and ideas
```

## 🚀 Core Features

### 1. Multi-Domain Interview Categories
- **Technical Interviews**: Coding & algorithms with live code editor
- **Behavioral Interviews**: Soft skills and STAR method responses (planned)
- **System Design**: Architecture and scalability questions (planned)
- **Domain-Specific**: Frontend, backend, DevOps specializations (planned)
- **Mock Interviews**: Full simulation with timing and scoring (planned)
- **Code Sandbox**: Full-featured IDE for experimentation

### 2. Resume-Powered Personalization
- PDF upload and intelligent text extraction
- AI-powered question generation based on resume content
- Context-aware interview flow tailored to candidate background
- Resume context integration across all interview types

### 3. Advanced Speech Processing
- Real-time audio recording and transcription
- Support for WEBM_OPUS format with Google Cloud Speech-to-Text
- Automatic silence detection and conversation flow
- Fallback to Google Cloud Storage for large audio files
- Voice-only interview modes for on-the-spot response testing

### 4. Integrated Development Environment
- Monaco Editor (VS Code engine) with syntax highlighting
- Multi-language support (Python, JavaScript, Java, C++)
- Real-time code execution and testing
- Split-pane interface with resizable panels
- Console output and error handling

### 5. AI-Powered Interview Experience
- Dynamic question generation based on candidate responses
- Resume context integration for personalized questions
- Real-time hints and guidance during problem-solving
- Adaptive difficulty based on performance
- Industry-specific interview models:
  - **Programming**: Frontend, Full-stack, Backend, AI/ML
  - **Marketing**: Campaign strategy, analytics, growth
  - **Finance**: Quantitative analysis, fundamental analysis, trading

### 6. Question Bank System
- Curated problem sets across multiple categories
- Difficulty progression from easy to expert
- Real interview questions from top companies
- Custom problem creation and management
- Test case validation and automated scoring

## 📡 API Endpoints

### Core Interview Endpoints

#### `POST /upload-resume`
- **Purpose**: Upload and process PDF resume for personalized interviews
- **Input**: Multipart form with 'resume' field (PDF file, max 10MB)
- **Output**: JSON with initial AI-generated question and resume processing status
- **Features**: 
  - PDF text extraction with validation
  - AI question generation based on resume content
  - Automatic file cleanup and error handling
  - Resume context storage for session

#### `POST /upload`
- **Purpose**: Process audio responses and generate follow-up questions
- **Input**: Multipart form with 'audio' field (WEBM audio)
- **Output**: JSON with transcription and contextual next question
- **Features**:
  - Google Cloud Speech-to-Text conversion
  - Resume-aware question generation
  - Large file handling via Google Cloud Storage
  - Conversation flow management

#### `POST /chat`
- **Purpose**: Handle text-based interview interactions
- **Input**: JSON with message field
- **Output**: JSON with AI interviewer response
- **Features**:
  - Context-aware responses
  - Hint generation and guidance
  - Problem-solving assistance

### Code Execution Endpoints

#### `POST /api/execute`
- **Purpose**: Execute code in multiple programming languages
- **Input**: JSON with code, language, and test cases
- **Output**: JSON with execution results, output, and errors
- **Supported Languages**: Python, JavaScript, Java, C++
- **Features**:
  - Sandboxed code execution
  - Test case validation
  - Performance metrics
  - Security restrictions

#### `GET /api/problems/:id`
- **Purpose**: Retrieve specific coding problems
- **Input**: Problem ID parameter
- **Output**: JSON with problem details, examples, and test cases
- **Features**:
  - Problem metadata and difficulty
  - Starter code templates
  - Example inputs/outputs
  - Hidden test cases

### Management Endpoints

#### `POST /reset-resume`
- **Purpose**: Clear stored resume context for new session
- **Output**: Success confirmation

#### `POST /clean-uploads`
- **Purpose**: Clean all temporary files and reset session
- **Output**: Number of files removed and cleanup status

#### `GET /test-pdf`
- **Purpose**: Verify PDF parser functionality and health check
- **Output**: Parser status and system availability

## 🔧 Setup Instructions

### Prerequisites
- **Node.js** (v16 or higher)
- **Google Cloud Platform** account with billing enabled
- **OpenAI API** key with GPT-3.5-turbo access
- **Git** for version control

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd Prep.AI
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3000
SESSION_SECRET=your_session_secret_here

# Google Cloud Configuration (optional - for production)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name

# Development Settings
NODE_ENV=development
```

### 3. Google Cloud Setup (Required for Speech Features)
1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable billing for the project

2. **Enable Required APIs**
   ```bash
   # Enable Speech-to-Text API
   gcloud services enable speech.googleapis.com
   
   # Enable Cloud Storage API
   gcloud services enable storage.googleapis.com
   ```

3. **Create Service Account**
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Grant minimal required roles for Speech-to-Text and Storage
   - Download the JSON key file
   - Rename it to `googenv.json` and place in project root
   - **Important**: Add `googenv.json` to your `.gitignore` file

4. **Create Storage Bucket**
   ```bash
   gsutil mb gs://your-unique-bucket-name
   ```

### 4. Start Development Server
```bash
# Development mode with auto-restart
npm run dev

# Or standard start
npm start
```

### 5. Access the Application
- **Landing Page**: `http://localhost:3000`
- **Interview Practice**: `http://localhost:3000/test`
- **Code Sandbox**: `http://localhost:3000/sandbox`

### 6. Testing the Features
1. **Resume Upload**: Upload a PDF resume to test personalized questions
2. **Voice Recording**: Test audio recording and transcription
3. **Code Editor**: Try the integrated Monaco Editor with different languages
4. **AI Chat**: Interact with the AI interviewer for hints and guidance

## 🎯 Development Workflow

### Current Development State
- ✅ **Core Interview System**: Basic interview flow with AI responses
- ✅ **Resume Intelligence**: PDF upload, parsing, and AI-powered personalization
- ✅ **Speech Processing**: Audio transcription with Google Cloud Speech-to-Text
- ✅ **Code Editor Integration**: Monaco Editor with multi-language support
- ✅ **Modern UI**: Professional landing page with test categories
- ✅ **IDE Interface**: Split-pane testing environment with resizable panels
- ✅ **File Management**: Automatic cleanup and session management
- ✅ **Question Bank Foundation**: Problem structure and API endpoints
- ✅ **Chat Interface**: Real-time AI interviewer interaction

### Active Development (High Priority)
- 🔄 **Response Streaming**: Real-time AI response generation for faster interactions
- 📊 **Industry Models**: Specialized interview prompts for different domains:
  - **Programming**: Frontend, Full-stack, Backend, AI/ML specializations
  - **Marketing**: Campaign strategy, growth hacking, analytics
  - **Finance**: Quantitative analysis, fundamental analysis, trading
- 🗣️ **Text-to-Speech**: ElevenLabs integration for voice responses
- 🏗️ **Code Execution**: Sandboxed code running and test case validation
- 📝 **Question Bank**: Curated problem sets with difficulty progression

### Planned Features (Medium Priority)
- 🔐 **Authentication System**: User accounts, progress tracking, subscription management
- 📊 **Analytics Dashboard**: Performance metrics, progress tracking, weak area identification
- 🎯 **Behavioral Interviews**: STAR method training and soft skills assessment
- 🏗️ **System Design**: Architecture questions with diagramming tools
- 📱 **Mobile Optimization**: Responsive design for mobile interview practice
- 🔄 **Session Management**: Save/resume interview sessions

### Future Roadmap (Long-term)
- 🤖 **Custom Model Training**: Fine-tuned models for specific interview types
- 🏢 **Enterprise Features**: Team management, bulk user accounts, analytics
- 🌐 **Hosting & Deployment**: Production-ready hosting with authentication
- ⚡ **React/Next.js Migration**: Modern framework migration for better performance
- 🔗 **API Integration**: Third-party integrations (LinkedIn, GitHub, etc.)
- 📈 **Advanced Analytics**: ML-powered performance insights and recommendations

### Development Guidelines
1. **File Organization**: Keep related functionality together in src folders
2. **Error Handling**: Implement comprehensive error handling for all endpoints
3. **File Cleanup**: Always clean up uploaded files after processing
4. **API Consistency**: Maintain consistent JSON response format
5. **Security**: Validate file types and implement proper input sanitization

## 🧪 Testing & Quality Assurance

### Manual Testing Checklist

#### **Landing Page Testing**
- [ ] All test category cards display correctly
- [ ] Navigation links work properly
- [ ] Responsive design on mobile/tablet
- [ ] "Start Practice" buttons navigate correctly

#### **Resume Upload Testing**
- [ ] PDF file browser opens when clicking upload area
- [ ] Drag & drop functionality works
- [ ] File validation (PDF only, max 10MB)
- [ ] Text extraction from various PDF formats
- [ ] AI question generation based on resume content
- [ ] Error handling for corrupted/invalid PDFs
- [ ] Reset functionality clears resume context

#### **Interview System Testing**
- [ ] Audio recording starts/stops correctly
- [ ] Silence detection triggers automatic stop
- [ ] Speech-to-text transcription accuracy
- [ ] AI responses are contextual and relevant
- [ ] Conversation flow maintains context
- [ ] Manual conversation ending works

#### **Code Editor Testing**
- [ ] Monaco Editor loads and displays correctly
- [ ] Syntax highlighting for all supported languages
- [ ] Code execution works for Python, JavaScript, Java, C++
- [ ] Console output displays correctly
- [ ] Error messages are clear and helpful
- [ ] Split-pane resizing works smoothly
- [ ] Code persistence during language switching

#### **Chat Interface Testing**
- [ ] Text input and send functionality
- [ ] Character count and limits work
- [ ] AI responses are helpful and contextual
- [ ] Message history displays correctly
- [ ] Microphone and attachment buttons (UI only)

### API Testing

#### **Core Endpoints**
```bash
# Test resume upload
curl -X POST -F "resume=@sample_resume.pdf" http://localhost:3000/upload-resume

# Test audio upload
curl -X POST -F "audio=@sample_audio.webm" http://localhost:3000/upload

# Test chat interaction
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"What is a binary search tree?"}' \
  http://localhost:3000/chat

# Test file cleanup
curl -X POST http://localhost:3000/clean-uploads

# Health check
curl http://localhost:3000/test-pdf
```

#### **Error Handling Tests**
- [ ] Invalid file types return proper error messages
- [ ] Large file uploads are handled gracefully
- [ ] Missing API keys show clear error messages
- [ ] Network timeouts are handled properly
- [ ] Malformed requests return appropriate HTTP status codes

### Performance Testing
- [ ] Page load times under 3 seconds
- [ ] Code editor responsive to typing
- [ ] AI response times under 10 seconds
- [ ] File upload progress indicators work
- [ ] Memory usage stays reasonable during long sessions

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## 📁 File Management

### Uploads Directory
- **Purpose**: Temporary storage for uploaded files
- **Cleanup**: Automatic cleanup after processing
- **Manual Cleanup**: Use `/clean-uploads` endpoint
- **File Types**: PDF (resume), WEBM (audio)

### Google Cloud Storage
- **Purpose**: Handle large audio files (>60 seconds)
- **Bucket**: Configured via environment variables
- **Cleanup**: Automatic deletion after transcription

## 🔒 Security Considerations

### Current Implementation
- File type validation (PDF for resume, audio for responses)
- Automatic file cleanup to prevent storage buildup
- No persistent storage of sensitive data
- Environment variable configuration for sensitive data

### Critical Security Requirements
- **Never commit sensitive files**: Add `googenv.json`, `.env` to `.gitignore`
- **API Key Protection**: Store all API keys in environment variables only
- **File Upload Limits**: Enforce file size and type restrictions
- **Input Sanitization**: Validate and sanitize all user inputs
- **Rate Limiting**: Implement API rate limiting to prevent abuse

### Recommended Production Improvements
- **HTTPS Enforcement**: SSL/TLS for all communications
- **User Authentication**: Secure user session management
- **Database Security**: Encrypted connections and data at rest
- **Monitoring**: Security event logging and alerting
- **Access Control**: Principle of least privilege for all services
- **Regular Updates**: Keep all dependencies updated for security patches

### Files to Keep Private
```bash
# Add to .gitignore
.env
googenv.json
*.key
*.pem
node_modules/
uploads/
temp/
```

## 🚀 Deployment & Hosting

### Development Environment
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

### Production Deployment Options

#### **Option 1: Vercel (Recommended for MVP)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod

# Environment variables in Vercel dashboard:
# - OPENAI_API_KEY
# - GOOGLE_CLOUD_PROJECT_ID
# - SESSION_SECRET
```

**Pros**: Free tier, automatic HTTPS, easy deployment
**Cons**: Serverless limitations, function timeouts

#### **Option 2: Railway**
```bash
# Connect GitHub repository to Railway
# Set environment variables in Railway dashboard
# Automatic deployments on git push
```

**Pros**: Full Node.js support, easy scaling, $5/month
**Cons**: No free tier

#### **Option 3: DigitalOcean Droplet**
```bash
# Create $6/month droplet
# Install Node.js, PM2, Nginx
# Set up SSL with Let's Encrypt
# Configure reverse proxy
```

**Pros**: Full control, scalable, cost-effective
**Cons**: More complex setup and maintenance

### Production Checklist
- [ ] **Environment Variables**: All secrets configured securely
- [ ] **HTTPS**: SSL certificate installed and configured
- [ ] **Domain**: Custom domain pointing to hosting service
- [ ] **Database**: MongoDB Atlas or PostgreSQL configured
- [ ] **File Storage**: Google Cloud Storage bucket configured
- [ ] **Monitoring**: Error tracking and performance monitoring
- [ ] **Backups**: Automated backup strategy implemented
- [ ] **Rate Limiting**: API rate limiting configured
- [ ] **Security**: Input validation and sanitization
- [ ] **CDN**: Static assets served via CDN (optional)

### Hosting Costs (Monthly Estimates)

#### **Free Tier (MVP)**
- Vercel: $0
- MongoDB Atlas: $0 (512MB)
- Google Cloud: $0 (free tier)
- Domain: $12/year
- **Total: ~$1/month**

#### **Growth Tier (100+ users)**
- Vercel Pro: $20
- MongoDB Atlas: $9
- Google Cloud: $10
- Domain: $12/year
- **Total: ~$40/month**

#### **Scale Tier (1000+ users)**
- Railway/DigitalOcean: $20-50
- MongoDB Atlas: $57
- Google Cloud: $50
- Domain: $12/year
- **Total: ~$130/month**

### Environment Variables Reference
```env
# Required for all deployments
OPENAI_API_KEY=sk-...
SESSION_SECRET=random-secret-key
NODE_ENV=production

# Required for speech features
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name

# Optional for enhanced features
MONGODB_URI=mongodb+srv://...
STRIPE_SECRET_KEY=sk_live_...
SENTRY_DSN=https://...
```

## 🤝 Contributing & Development

### Development Workflow
1. **Check Priorities**: Review `tickets.MD` for current development priorities
2. **Feature Branches**: Create feature branches for new development
3. **Code Quality**: Implement comprehensive error handling and logging
4. **Testing**: Test all endpoints and UI components thoroughly
5. **Documentation**: Update README and API documentation
6. **Code Review**: Follow existing patterns and conventions

### Code Standards & Best Practices

#### **Backend Development**
- Use ES6+ features and modern JavaScript
- Implement comprehensive error handling with try-catch blocks
- Add detailed logging for debugging and monitoring
- Follow RESTful API conventions
- Validate all inputs and sanitize data
- Use middleware for common functionality
- Document all API endpoints with examples

#### **Frontend Development**
- Use semantic HTML and accessible design patterns
- Implement responsive design for all screen sizes
- Add loading states and error handling for all user interactions
- Use consistent naming conventions for CSS classes
- Optimize for performance (lazy loading, code splitting)
- Test across multiple browsers and devices

#### **File Organization**
```
src/
├── public/           # Frontend pages and assets
├── server/           # Backend API routes and middleware
├── config/           # Configuration files
└── utils/            # Shared utility functions
```

### Development Environment Setup
```bash
# Install development dependencies
npm install --save-dev nodemon eslint prettier

# Run with auto-reload
npm run dev

# Run linting
npm run lint

# Format code
npm run format
```

### Contribution Guidelines
- **Bug Reports**: Include steps to reproduce, expected vs actual behavior
- **Feature Requests**: Describe the use case and proposed solution
- **Pull Requests**: Include tests, documentation, and clear commit messages
- **Code Style**: Follow existing patterns and use consistent formatting
- **Testing**: Add tests for new features and bug fixes

### Priority Areas for Contribution
1. **Question Bank Expansion**: Add more coding problems and test cases
2. **Industry-Specific Models**: Develop specialized interview prompts
3. **UI/UX Improvements**: Enhance user experience and accessibility
4. **Performance Optimization**: Improve response times and resource usage
5. **Mobile Experience**: Optimize for mobile and tablet devices
6. **Authentication System**: Implement user accounts and progress tracking

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

## 📋 Current Development Status

### ✅ Completed Features
- **Core Interview System**: AI-powered interview flow with resume integration
- **Resume Intelligence**: PDF parsing and personalized question generation
- **Speech Processing**: Real-time audio recording and transcription
- **Code Editor**: Monaco Editor integration with multi-language support
- **Modern UI**: Professional landing page and testing interface
- **File Management**: Automatic cleanup and session management

### 🔄 In Progress
- **Response Streaming**: Real-time AI response generation
- **Industry Models**: Specialized prompts for different domains
- **Question Bank**: Curated problem sets with test case validation
- **Code Execution**: Sandboxed code running and testing

### 📅 Roadmap
- **Authentication**: User accounts and progress tracking
- **Analytics**: Performance metrics and improvement insights
- **Mobile Optimization**: Responsive design for all devices
- **Production Deployment**: Hosting setup with authentication

---

## 📞 Support & Resources

### Documentation
- **Development Tickets**: See `tickets.MD` for current priorities
- **Design Notes**: See `design.md` for UI/UX guidelines
- **Hosting Plan**: See `HOSTING_PLAN.md` for deployment strategy
- **Development Notes**: See `notes.md` for additional context

### External Resources
- **OpenAI API**: [Documentation](https://platform.openai.com/docs)
- **Google Cloud Speech**: [Documentation](https://cloud.google.com/speech-to-text)
- **Monaco Editor**: [Documentation](https://microsoft.github.io/monaco-editor/)
- **Express.js**: [Documentation](https://expressjs.com/)

### Getting Help
- Check existing issues and documentation first
- Create detailed bug reports with reproduction steps
- Join development discussions in project issues
- Follow the contribution guidelines for pull requests

---

**Note**: This is an actively developed project. Check `tickets.MD` for the latest development priorities and planned features. The codebase is designed for rapid iteration and feature expansion. 

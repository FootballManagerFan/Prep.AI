import express from 'express';
import cors from 'cors';
import session from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'prepai_dev_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 6 } // 6 hours
}));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'resume' && file.mimetype === 'application/pdf') {
      cb(null, true);
    } else if (file.fieldname === 'audio') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Helper function to build system prompt
function buildSystemPrompt(resumeContext) {
  const base = `You are Prep.AI, a focused interview coach. 
- Ask one question at a time.
- Use the user's resume context when helpful.
- Keep responses concise, professional, and specific. 
- Follow up based on the user's last answer.`;
  
  if (!resumeContext) return base;
  return `${base}\n\nResume Context (use as background only):\n${resumeContext.slice(0, 5000)}`;
}

// Google Speech client
const client = new SpeechClient({ keyFilename: path.join(__dirname, 'googenv.json') });

// Google Cloud Storage client
const storageClient = new Storage({ keyFilename: path.join(__dirname, 'googenv.json') });
const bucketName = 'prepai_bucket';
const bucket = storageClient.bucket(bucketName);

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Resume upload route (updated for sessions)
app.post('/upload-resume', upload.single('resume'), async (req, res) => {
  console.log('=== RESUME UPLOAD REQUEST ===');
  console.log('Session ID:', req.sessionID);
  console.log('Request headers:', req.headers);
  
  if (!req.file) {
    console.log('❌ No file uploaded');
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }
  
  console.log('✅ File received:', {
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    path: req.file.path
  });
  
  try {
    // Check if file exists
    if (!fs.existsSync(req.file.path)) {
      throw new Error('Uploaded file not found');
    }
    
    console.log('📖 Reading file buffer...');
    const dataBuffer = fs.readFileSync(req.file.path);
    console.log('📦 Buffer size:', dataBuffer.length);
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (dataBuffer.length > maxSize) {
      throw new Error(`File too large (${Math.round(dataBuffer.length / 1024 / 1024)}MB). Maximum size is 10MB.`);
    }
    
    console.log('🔍 Parsing PDF...');
    const pdfData = await pdfParse(dataBuffer);
    console.log('✅ PDF parsed successfully. Text length:', pdfData.text.length);
    console.log('📄 First 200 chars:', JSON.stringify(pdfData.text.substring(0, 200)));
    
    // Store in session instead of global variable
    req.session.resumeContext = pdfData.text;
    req.session.messages = []; // Reset chat history when resume changes
    
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
    console.log('🧹 File cleaned up');
    
    // Validate that we have meaningful text
    if (!req.session.resumeContext || req.session.resumeContext.trim().length < 50) {
      throw new Error('Could not extract meaningful text from PDF. Please ensure the PDF contains readable text (not just images).');
    }
    
    console.log('🤖 Generating AI question...');
    console.log('🔑 OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
    console.log('🔑 API Key prefix:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'NOT SET');
    
    // Generate initial question based on resume
    const messages = [
      { role: 'system', content: buildSystemPrompt(req.session.resumeContext) },
      { role: 'user', content: 'Start the interview with a strong opening question tailored to my resume.' }
    ];
    
    console.log('📝 Messages to send:', messages.length, 'messages');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.5,
      max_tokens: 200
    });

    const firstQuestion = completion.choices[0]?.message?.content?.trim() || 'Tell me about yourself and your background.';
    
    // Seed history with assistant question
    req.session.messages = [{ role: 'assistant', content: firstQuestion }];

    console.log('✅ AI question generated successfully');
    console.log('💬 Generated question:', firstQuestion);
    
    res.json({ 
      message: 'Resume processed successfully!', 
      initialQuestion: firstQuestion,
      resumeProcessed: true,
      textLength: req.session.resumeContext.length
    });
  } catch (error) {
    console.error('❌ Resume processing error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Cleaned up file after error');
      } catch (cleanupError) {
        console.error('❌ Error cleaning up file:', cleanupError);
      }
    }
    
    // Provide specific error messages based on error type
    let userMessage = 'Error processing resume';
    if (error.message.includes('API key')) {
      userMessage = 'OpenAI API key issue. Please check your configuration.';
    } else if (error.message.includes('PDF')) {
      userMessage = 'Could not read PDF file. Please ensure it contains selectable text.';
    } else if (error.message.includes('too large')) {
      userMessage = error.message; // Pass through size error as is
    } else if (error.code === 'insufficient_quota') {
      userMessage = 'OpenAI API quota exceeded. Please check your billing.';
    } else if (error.code === 'rate_limit_exceeded') {
      userMessage = 'Too many requests. Please wait a moment and try again.';
    }
    
    res.status(500).json({ 
      error: userMessage, 
      details: error.message,
      type: error.name || 'Unknown error',
      code: error.code
    });
  }
});

// Audio upload + processing route (updated for sessions)
app.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });
  
  try {
    let transcription;
    try {
      const data = fs.readFileSync(req.file.path);
      const audioBytes = data.toString('base64');
      const audio = { content: audioBytes };
      const config = { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: 'en-US' };
      const request = { audio, config };
      const [op] = await client.longRunningRecognize(request);
      const [response] = await op.promise();
      transcription = response.results.map(r => r.alternatives[0].transcript).join('\n');
    } catch (e) {
      if (e.message.includes('Inline audio exceeds duration limit')) {
        const gcsFileName = `audio-${Date.now()}.webm`;
        const gcsFile = bucket.file(gcsFileName);
        await gcsFile.save(fs.readFileSync(req.file.path), { metadata: { contentType: 'audio/webm' } });
        const audio = { uri: `gs://${bucketName}/${gcsFileName}` };
        const config = { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: 'en-US' };
        const request = { audio, config };
        const [op] = await client.longRunningRecognize(request);
        const [response] = await op.promise();
        transcription = response.results.map(r => r.alternatives[0].transcript).join('\n');
        await gcsFile.delete();
      } else throw e;
    }
    
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
    
    // Then call OpenAI like /chat using transcript as user message
    if (!req.session.messages) req.session.messages = [];
    const resumeContext = req.session.resumeContext || '';

    const thread = [
      { role: 'system', content: buildSystemPrompt(resumeContext) },
      ...req.session.messages,
      { role: 'user', content: transcription }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: thread,
      temperature: 0.5
    });
    
    const reply = completion.choices[0]?.message?.content?.trim() || '…';

    req.session.messages.push({ role: 'user', content: transcription });
    req.session.messages.push({ role: 'assistant', content: reply });

    res.json({ message: 'Audio processed!', transcription, nextQuestion: reply });
  } catch (error) {
    console.error('Audio processing error:', error);
    res.status(500).json({ error: 'Error processing audio', details: error.message });
  }
});

// New chat endpoint for text messages
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Empty message' });
    }

    if (!req.session.messages) req.session.messages = [];
    const resumeContext = req.session.resumeContext || '';

    const thread = [
      { role: 'system', content: buildSystemPrompt(resumeContext) },
      ...req.session.messages,
      { role: 'user', content: message.trim() }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: thread,
      temperature: 0.5
    });

    const reply = completion.choices[0]?.message?.content?.trim() || '…';
    
    // Update session history
    req.session.messages.push({ role: 'user', content: message.trim() });
    req.session.messages.push({ role: 'assistant', content: reply });

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat error' });
  }
});

// Test PDF parsing route
app.get('/test-pdf', (req, res) => {
  res.json({ 
    message: 'PDF parser loaded successfully',
    pdfParseAvailable: typeof pdfParse === 'function'
  });
});

// Test OpenAI connectivity
app.get('/test-openai', async (req, res) => {
  try {
    console.log('🧪 Testing OpenAI connectivity...');
    console.log('🔑 API Key available:', !!process.env.OPENAI_API_KEY);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello, respond with "OpenAI connection successful!"' }],
      max_tokens: 50
    });
    
    const response = completion.choices[0]?.message?.content?.trim();
    
    res.json({
      success: true,
      message: 'OpenAI connection successful',
      response: response,
      model: 'gpt-3.5-turbo'
    });
  } catch (error) {
    console.error('❌ OpenAI test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      type: error.type
    });
  }
});

// Reset resume context route (updated for sessions)
app.post('/reset-resume', (req, res) => {
  req.session.resumeContext = null;
  req.session.messages = [];
  res.json({ message: 'Resume context reset successfully' });
});

// Cleanup uploads route (updated for sessions)
app.post('/clean-uploads', (req, res) => {
  try {
    const uploadDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadDir);
    files.forEach(f => fs.unlinkSync(path.join(uploadDir, f)));
    req.session.resumeContext = null; // Also reset resume context when cleaning
    req.session.messages = [];
    res.json({ message: 'Uploads folder cleaned successfully', filesRemoved: files.length });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Error cleaning uploads folder', details: error.message });
  }
});

// Environment validation
function validateEnvironment() {
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️  WARNING: Missing environment variables:', missing);
    console.warn('⚠️  Please ensure you have a .env file with OPENAI_API_KEY');
  } else {
    console.log('✅ Environment variables validated');
  }
  
  // Check if Google Cloud credentials exist
  const gcpPath = path.join(__dirname, 'googenv.json');
  if (!fs.existsSync(gcpPath)) {
    console.warn('⚠️  WARNING: googenv.json not found - audio transcription may fail');
  } else {
    console.log('✅ Google Cloud credentials found');
  }
}

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  validateEnvironment();
});
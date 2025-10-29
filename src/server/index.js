const express = require('express');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { SpeechClient } = require('@google-cloud/speech');
const { Storage } = require('@google-cloud/storage');
const OpenAI = require('openai');
const dotenv = require('dotenv');
// const Docker = require('dockerode');
// Check if fetch is available (Node 18+), otherwise use polyfill
const fetch = globalThis.fetch || require('node-fetch');
const pdfParse = require('pdf-parse');

// Import database service
const DatabaseService = require('../../backend/database/databaseService');
const db = new DatabaseService();

dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'prepai_dev_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 6 } // 6 hours
}));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/')),
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
const client = new SpeechClient({ keyFilename: path.join(__dirname, '../../googenv.json') });

// Google Cloud Storage client
const storageClient = new Storage({ keyFilename: path.join(__dirname, '../../googenv.json') });
const bucketName = 'prepai_bucket';
const bucket = storageClient.bucket(bucketName);

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Docker client
// const docker = new Docker();

/*
// Test Docker connectivity
app.get('/test-docker', async (req, res) => {
  try {
    console.log('🧪 Testing Docker connectivity...');
    
    // Test if Docker daemon is accessible
    const info = await docker.info();
    console.log('✅ Docker daemon accessible');
    
    // Test if we can list images
    const images = await docker.listImages();
    console.log(`✅ Found ${images.length} Docker images`);
    
    // Test if Python image exists
    const pythonImage = images.find(img => img.RepoTags && img.RepoTags.includes('python:3.9-slim'));
    if (pythonImage) {
      console.log('✅ Python image found');
    } else {
      console.log('⚠️ Python image not found, pulling...');
      await docker.pull('python:3.9-slim');
      console.log('✅ Python image pulled');
    }
    
    res.json({ 
      success: true, 
      message: 'Docker is working correctly',
      dockerInfo: info,
      imageCount: images.length
    });
  } catch (error) {
    console.error('❌ Docker test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      type: 'Docker connectivity issue'
    });
  }
});
*/

// Code execution endpoint (using Piston API)
app.post('/execute-code', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ 
        success: false, 
        error: 'Code and language required' 
      });
    }
    
    console.log(`Executing ${language} code via Piston API...`);
    const output = await executeCodeWithPiston(code, language);
    
    res.json({ success: true, output });
  } catch (error) {
    console.error('Code execution error:', error);
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Piston API code execution (no API key required)
async function executeCodeWithPiston(code, language) {
  const languageMap = {
    'python': 'python',
    'javascript': 'javascript',
    'java': 'java',
    'cpp': 'c++'
  };

  const pistonLanguage = languageMap[language];
  if (!pistonLanguage) {
    throw new Error(`Language not supported: ${language}`);
  }

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonLanguage,
        version: '*',
        files: [{
          name: 'main',
          content: code
        }]
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Piston API error: ${result.message || 'Unknown error'}`);
    }
    
    if (result.run.stdout) {
      return result.run.stdout.trim();
    } else if (result.run.stderr) {
      throw new Error(result.run.stderr.trim());
    } else if (result.run.output) {
      return result.run.output.trim();
    } else {
      return '(no output)';
    }
  } catch (error) {
    throw new Error(`Code execution failed: ${error.message}`);
  }
}

/*
// Python execution with Docker
async function executePythonCode(code) {
  return new Promise(async (resolve, reject) => {
    let container = null;
    let filePath = null;
    
    try {
      console.log('🐍 Starting Python execution...');
      
      // Create temporary file
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      const fileName = `code_${Date.now()}.py`;
      filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, code);
      console.log(`📝 Created temp file: ${filePath}`);
      
      // Create and run Docker container
      console.log('🐳 Creating Docker container...');
      container = await docker.createContainer({
        Image: 'python:3.9-slim',
        Cmd: ['python', `/tmp/${fileName}`],
        HostConfig: {
          Binds: [`${filePath}:/tmp/${fileName}:ro`],
          Memory: 100 * 1024 * 1024, // 100MB limit
          MemorySwap: 100 * 1024 * 1024,
          CpuPeriod: 100000,
          CpuQuota: 50000, // 50% CPU limit
          NetworkMode: 'none', // No network access
          ReadOnlyRootfs: true,
          SecurityOpt: ['no-new-privileges:true']
        },
        WorkingDir: '/tmp',
        Tty: false,
        OpenStdin: false
      });
      
      console.log('🚀 Starting container...');
      await container.start();
      console.log('✅ Container started successfully');
      
      // Wait for completion with timeout
      const timeout = setTimeout(async () => {
        console.log('⏰ Timeout reached, stopping container...');
        try {
          if (container) {
            await container.stop();
            await container.remove();
          }
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(new Error('Execution timeout (10 seconds)'));
        } catch (e) {
          console.error('❌ Timeout cleanup error:', e);
        }
      }, 10000); // 10 second timeout
      
      // Wait for container to finish
      console.log('⏳ Waiting for container to finish...');
      const exitCode = await container.wait();
      console.log(`✅ Container finished with exit code: ${exitCode.StatusCode}`);
      
      // Get container logs AFTER completion
      console.log('📋 Getting container logs...');
      const logs = await container.logs({ stdout: true, stderr: true });
      let output = logs.toString();
      
      // AGGRESSIVE cleaning - remove ALL weird Docker symbols and non-standard characters
      output = output
        // Remove all Docker artifacts and weird symbols (comprehensive list)
        .replace(/[☺♂♣‼∟⌂☻♥♦♠♣•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼]/g, '')
        // Remove any other non-printable characters except basic punctuation
        .replace(/[^\x20-\x7E\n\r\t]/g, '')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        // Remove empty lines and normalize spacing
        .replace(/\n\s*\n/g, '\n')
        .trim();  // Remove extra whitespace
      
      console.log(`📤 Clean container output: "${output}"`);
      
      // Cleanup
      clearTimeout(timeout);
      
      // Try to stop and remove container, but don't fail if already stopped
      try {
        await container.stop();
      } catch (e) {
        if (e.statusCode !== 304) { // 304 means already stopped
          console.log('⚠️ Container stop warning:', e.message);
        } else {
          console.log('✅ Container already stopped naturally');
        }
      }
      
      try {
        await container.remove();
      } catch (e) {
        if (e.statusCode !== 304) { // 304 means already removed
          console.log('⚠️ Container remove warning:', e.message);
        } else {
          console.log('✅ Container already removed naturally');
        }
      }
      
      // Clean up temp file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      resolve(output);
      
    } catch (error) {
      console.error('❌ Python execution error:', error);
      
      // Cleanup on error
      // Cleanup on error
      if (container) {
        try {
          await container.stop();
        } catch (e) {
          if (e.statusCode !== 304) {
            console.log('⚠️ Container stop warning:', e.message);
          } else {
            console.log('✅ Container already stopped naturally');
          }
        }
        
        try {
          await container.remove();
        } catch (e) {
          if (e.statusCode !== 304) {
            console.log('⚠️ Container remove warning:', e.message);
          } else {
            console.log('✅ Container already removed naturally');
          }
        }
      }
      
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('❌ Error cleaning up file:', cleanupError);
        }
      }
      
      reject(new Error(`Python execution failed: ${error.message}`));
    }
  });
}

*/

/*
// JavaScript execution (safer Node.js approach)
async function executeJavaScriptCode(code) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create temporary file
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      const fileName = `code_${Date.now()}.js`;
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, code);
      
      // Create and run Docker container
      const container = await docker.createContainer({
        Image: 'node:18-alpine',
        Cmd: ['node', `/tmp/${fileName}`],
        HostConfig: {
          Binds: [`${filePath}:/tmp/${fileName}:ro`],
          Memory: 100 * 1024 * 1024, // 100MB limit
          MemorySwap: 100 * 1024 * 1024,
          CpuPeriod: 100000,
          CpuQuota: 50000, // 50% CPU limit
          NetworkMode: 'none', // No network access
          ReadOnlyRootfs: true,
          SecurityOpt: ['no-new-privileges:true']
        },
        WorkingDir: '/tmp',
        Tty: false,
        OpenStdin: false
      });
      
      // Start container with timeout
      await container.start();
      
      // Wait for completion with timeout
      const timeout = setTimeout(async () => {
        try {
          await container.stop();
          await container.remove();
          fs.unlinkSync(filePath);
          reject(new Error('Execution timeout (10 seconds)'));
        } catch (e) {
          console.error('Timeout cleanup error:', e);
        }
      }, 10000); // 10 second timeout
      
      // Wait for container to finish
      const exitCode = await container.wait();
      console.log(`Container finished with exit code: ${exitCode.StatusCode}`);
      
      // Get container logs AFTER completion
      const logs = await container.logs({ stdout: true, stderr: true });
      let output = logs.toString();
      
      // AGGRESSIVE cleaning - remove ALL weird Docker symbols and non-standard characters
      output = output
        // Remove all Docker artifacts and weird symbols (comprehensive list)
        .replace(/[☺♂♣‼∟⌂☻♥♦♠♣•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼]/g, '')
        // Remove any other non-printable characters except basic punctuation
        .replace(/[^\x20-\x7E\n\r\t]/g, '')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        // Remove empty lines and normalize spacing
        .replace(/\n\s*\n/g, '\n')
        .trim();  // Remove extra whitespace
      
      console.log(`📤 Clean container output: "${output}"`);
      
      // Cleanup
      clearTimeout(timeout);
      
      // Try to stop and remove container, but don't fail if already stopped
      try {
        await container.stop();
      } catch (e) {
        if (e.statusCode !== 304) { // 304 means already stopped
          console.log('⚠️ Container stop warning:', e.message);
        } else {
          console.log('✅ Container already stopped naturally');
        }
      }
      
      try {
        await container.remove();
      } catch (e) {
        if (e.statusCode !== 304) { // 304 means already removed
          console.log('⚠️ Container remove warning:', e.message);
        } else {
          console.log('✅ Container already removed naturally');
        }
      }
      
      // Clean up temp file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      resolve(output);
      
    } catch (error) {
      reject(new Error(`JavaScript execution failed: ${error.message}`));
    }
  });
}

*/

// Serve home page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve test page at /test (use the main test-page.html)
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/test-page.html'));
});

// Backward compatibility - also serve test page at /test-page.html
app.get('/test-page.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/test-page.html'));
});

// Serve sandbox page
app.get('/sandbox', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/sandbox.html'));
});

// Serve algorithms page
app.get('/algorithms', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/algorithms.html'));
});

// Serve speed test page
app.get('/speed-test', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/speed-test.html'));
});

// Practice routes for algorithm categories
app.get('/practice/two-pointers', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/practice/two-pointers.html'));
});

app.get('/practice/stack', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/practice/stack.html'));
});

app.get('/practice/sliding-window', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/practice/sliding-window.html'));
});

app.get('/practice/binary-search', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/practice/binary-search.html'));
});

app.get('/practice/hashing', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/practice/hashing.html'));
});

app.get('/practice/random', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/practice/random.html'));
});

// API root endpoint - provides information about available endpoints
app.get('/api', (req, res) => {
  res.json({
    message: 'Prep.AI API',
    version: '1.0.0',
    endpoints: {
      problems: {
        'GET /api/problems': 'Get all coding problems',
        'GET /api/problems/:id': 'Get specific problem by ID',
        'GET /api/search?q=term': 'Search problems by title or tags'
      },
      categories: {
        'GET /api/categories': 'Get all problem categories',
        'GET /api/categories/:name/problems': 'Get problems in specific category'
      },
      execution: {
        'POST /api/execute-code': 'Execute code in sandboxed environment'
      }
    },
    documentation: 'See individual endpoints for detailed response formats',
    baseUrl: `${req.protocol}://${req.get('host')}/api`
  });
});

// Database API endpoints
app.get('/api/problems', (req, res) => {
  try {
    const problems = db.getAllProblems();
    res.json({ success: true, data: problems });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/problems/:id', (req, res) => {
  try {
    const problem = db.getProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    res.json({ success: true, data: problem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const categories = db.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/categories/:name/problems', (req, res) => {
  try {
    const problems = db.getProblemsByCategory(req.params.name);
    res.json({ success: true, data: problems });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }
    const results = db.searchProblems(q);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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
    const uploadDir = path.join(__dirname, '../../uploads');
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
  const gcpPath = path.join(__dirname, '../../googenv.json');
  if (!fs.existsSync(gcpPath)) {
    console.warn('⚠️  WARNING: googenv.json not found - audio transcription may fail');
  } else {
    console.log('✅ Google Cloud credentials found');
  }
}

// Export the app for use in the main server file
module.exports = app;
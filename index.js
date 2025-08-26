import express from 'express';
import cors from 'cors';
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
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

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

// Store resume context for personalized questions
let resumeContext = null;

// Google Speech client
const client = new SpeechClient({ keyFilename: path.join(__dirname, 'googenv.json') });

// Google Cloud Storage client
const storageClient = new Storage({ keyFilename: path.join(__dirname, 'googenv.json') });
const bucketName = 'prepai_bucket';
const bucket = storageClient.bucket(bucketName);

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Resume upload route
app.post('/upload-resume', upload.single('resume'), async (req, res) => {
  console.log('Resume upload request received');
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }
  
  console.log('File received:', req.file.originalname, 'Size:', req.file.size);
  
  try {
    // Check if file exists
    if (!fs.existsSync(req.file.path)) {
      throw new Error('Uploaded file not found');
    }
    
    console.log('Reading file buffer...');
    const dataBuffer = fs.readFileSync(req.file.path);
    console.log('Buffer size:', dataBuffer.length);
    
    console.log('Parsing PDF...');
    const pdfData = await pdfParse(dataBuffer);
    console.log('PDF parsed successfully. Text length:', pdfData.text.length);
    console.log('First 200 chars:', pdfData.text.substring(0, 200));
    
    resumeContext = pdfData.text;
    
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
    console.log('File cleaned up');
    
    // Validate that we have meaningful text
    if (!resumeContext || resumeContext.trim().length < 50) {
      throw new Error('Could not extract meaningful text from PDF. Please ensure the PDF contains readable text.');
    }
    
    console.log('Generating AI question...');
    // Generate initial question based on resume
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `You are a professional technical interviewer. Based on the candidate's resume, ask relevant technical questions that match their experience and skills. Keep questions engaging and appropriate to their background.

Resume content: ${resumeContext}` 
        },
        { 
          role: 'user', 
          content: 'Generate an opening technical question based on this candidate\'s resume.' 
        }
      ],
      max_tokens: 150
    });

    console.log('AI question generated successfully');
    res.json({ 
      message: 'Resume processed successfully!', 
      initialQuestion: completion.choices[0].message.content,
      resumeProcessed: true,
      textLength: resumeContext.length
    });
  } catch (error) {
    console.error('Resume processing error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Error processing resume', 
      details: error.message,
      type: error.name || 'Unknown error'
    });
  }
});

// Audio upload + processing route
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
    const systemMessage = resumeContext 
      ? `You are a professional technical interviewer. Given the candidate's answer, ask the next relevant technical question based on their resume and previous responses. Keep responses concise and engaging.

Candidate's resume context: ${resumeContext}`
      : 'You are a professional technical interviewer. Given the candidate\'s answer, you ask the next question. Keep responses concise and engaging.';

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: `Candidate's answer: "${transcription}". Next question?` }
      ],
      max_tokens: 150
    });
    res.json({ message: 'Audio processed!', transcription, nextQuestion: completion.choices[0].message.content });
  } catch (error) {
    console.error('Audio processing error:', error);
    res.status(500).json({ error: 'Error processing audio', details: error.message });
  }
});

// Test PDF parsing route
app.get('/test-pdf', (req, res) => {
  res.json({ 
    message: 'PDF parser loaded successfully',
    pdfParseAvailable: typeof pdfParse === 'function'
  });
});

// Reset resume context route
app.post('/reset-resume', (req, res) => {
  resumeContext = null;
  res.json({ message: 'Resume context reset successfully' });
});

// Cleanup uploads route
app.post('/clean-uploads', (req, res) => {
  try {
    const uploadDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadDir);
    files.forEach(f => fs.unlinkSync(path.join(uploadDir, f)));
    resumeContext = null; // Also reset resume context when cleaning
    res.json({ message: 'Uploads folder cleaned successfully', filesRemoved: files.length });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Error cleaning uploads folder', details: error.message });
  }
});

// Start server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
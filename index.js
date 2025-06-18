import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { SpeechClient } from '@google-cloud/speech';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static HTML file
app.use(express.static(__dirname));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});
const upload = multer({ storage: storage });

// Google Speech client
const client = new SpeechClient();

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Route for audio upload + processing
app.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  console.log('Audio file received:', req.file);

  try {
    const file = fs.readFileSync(req.file.path);
    const audioBytes = file.toString('base64');

    const audio = { content: audioBytes };
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US'
    };
    const request = { audio, config };

    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    console.log('Transcription:', transcription);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional technical interviewer. Given the candidate\'s answer, you ask the next interview question. Keep responses concise and engaging.'
        },
        {
          role: 'user',
          content: `Candidate's answer: "${transcription}". What's the next question you would ask them?`
        }
      ],
      max_tokens: 150
    });

    const nextQuestion = completion.choices[0].message.content;
    console.log('Next Question:', nextQuestion);

    res.json({
      message: 'Audio processed!',
      transcription,
      nextQuestion
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong while processing the audio.' });
  }
});

// Serve the main HTML file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404s by serving the main HTML file
app.use((req, res) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/upload')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Static HTML app served from root directory`);
});

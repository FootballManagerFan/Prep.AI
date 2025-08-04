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
const client = new SpeechClient({
  keyFilename: path.join(__dirname, 'googenv.json')
});

// Google Cloud Storage client
const storageClient = new Storage({
  keyFilename: path.join(__dirname, 'googenv.json')
});
const bucketName = 'prepai_bucket';
const bucket = storageClient.bucket(bucketName);

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Route for audio upload + processing
app.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  try {
    let transcription;
    
    // Try inline processing first
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
      
      const [operation] = await client.longRunningRecognize(request);
      const [response] = await operation.promise();
      
      transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      
    } catch (inlineError) {
      // If inline fails due to duration limit, try GCS
      if (inlineError.message.includes('Inline audio exceeds duration limit')) {
        const gcsFileName = `audio-${Date.now()}.webm`;
        const file = bucket.file(gcsFileName);
        
        // Upload the file to GCS
        await file.save(fs.readFileSync(req.file.path), {
          metadata: { contentType: 'audio/webm' }
        });
        
        // Use GCS URI for speech recognition
        const audio = { uri: `gs://${bucketName}/${gcsFileName}` };
        const config = {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US'
        };
        const request = { audio, config };
        
        const [operation] = await client.longRunningRecognize(request);
        const [response] = await operation.promise();
        
        transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        
        // Clean up: delete the file from GCS
        await file.delete();
        
      } else {
        throw inlineError;
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional technical interviewer. Given the candidate\'s answer, you ask the next question. Keep responses concise and engaging.'
        },
        {
          role: 'user',
          content: `Candidate's answer: "${transcription}". What's the next question you would ask them?`
        }
      ],
      max_tokens: 150
    });

    const nextQuestion = completion.choices[0].message.content;

    res.json({
      message: 'Audio processed!',
      transcription,
      nextQuestion
    });

  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ 
      error: 'Error processing audio',
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

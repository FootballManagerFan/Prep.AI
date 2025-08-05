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
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Google Speech client
const client = new SpeechClient({ keyFilename: path.join(__dirname, 'googenv.json') });

// Google Cloud Storage client
const storageClient = new Storage({ keyFilename: path.join(__dirname, 'googenv.json') });
const bucketName = 'prepai_bucket';
const bucket = storageClient.bucket(bucketName);

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a professional technical interviewer. Given the candidate\'s answer, you ask the next question. Keep responses concise and engaging.' },
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

// Cleanup uploads route
app.post('/clean-uploads', (req, res) => {
  try {
    const uploadDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadDir);
    files.forEach(f => fs.unlinkSync(path.join(uploadDir, f)));
    res.json({ message: 'Uploads folder cleaned successfully', filesRemoved: files.length });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Error cleaning uploads folder', details: error.message });
  }
});

// Start server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
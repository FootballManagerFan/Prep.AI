// Configuration file for Prep.AI
require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: process.env.OPENAI_MAX_TOKENS || 200
  },
  
  // Google Cloud configuration
  googleCloud: {
    credentialsPath: process.env.GOOGLE_CLOUD_CREDENTIALS || '../../googenv.json',
    speechBucket: process.env.GOOGLE_CLOUD_BUCKET || 'prepai_bucket'
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'prepai_dev_secret',
    maxAge: 1000 * 60 * 60 * 6, // 6 hours
    resave: false,
    saveUninitialized: true
  },
  
  // File upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: {
      resume: ['application/pdf'],
      audio: ['audio/webm', 'audio/webm;codecs=opus']
    }
  },
  
  // Paths
  paths: {
    uploads: '../../uploads',
    public: '../public'
  }
};

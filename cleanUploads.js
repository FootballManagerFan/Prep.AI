/*
node cleanUploads.js == cleans audio files in upload folder.

*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = path.join(__dirname, 'uploads');

fs.readdir(uploadDir, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.unlink(path.join(uploadDir, file), err => {
      if (err) throw err;
    });
  }
});

console.log('🧹 Uploads folder cleaned.');

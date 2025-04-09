import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make the start-all.sh script executable
const scriptPath = path.join(__dirname, 'start-all.sh');
fs.chmodSync(scriptPath, '755');
console.log(`Made ${scriptPath} executable`);

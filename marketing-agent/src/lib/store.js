const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filename, fallback) {
  ensureDataDir();
  const file = path.join(DATA_DIR, filename);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

// Atomic write-then-rename so a crash or a racing request never leaves a
// half-written JSON file behind.
function writeJson(filename, data) {
  ensureDataDir();
  const file = path.join(DATA_DIR, filename);
  const tmpFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, file);
}

module.exports = { readJson, writeJson, DATA_DIR };

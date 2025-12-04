const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function loadTokens() {
  try {
    ensureDataDir();
    if (!fs.existsSync(TOKENS_FILE)) return [];
    const raw = await fs.promises.readFile(TOKENS_FILE, 'utf8');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('❌ Error loading tokens file:', error.message);
    return [];
  }
}

async function saveTokens(tokens) {
  try {
    ensureDataDir();
    await fs.promises.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Error saving tokens file:', error.message);
    return false;
  }
}

/**
 * Add or update a token record. Returns the saved record.
 */
async function addOrUpdateToken(fcmToken, userData = {}) {
  if (!fcmToken || typeof fcmToken !== 'string') {
    throw new Error('Invalid token');
  }

  const tokens = await loadTokens();

  const now = new Date().toISOString();

  const existingIndex = tokens.findIndex(t => t.token === fcmToken);
  const record = {
    token: fcmToken,
    userId: userData.userId || null,
    platform: userData.platform || null,
    deviceInfo: userData.deviceInfo || null,
    lastSeen: now,
    createdAt: existingIndex === -1 ? now : tokens[existingIndex].createdAt
  };

  if (existingIndex === -1) {
    tokens.push(record);
  } else {
    tokens[existingIndex] = { ...tokens[existingIndex], ...record };
  }

  await saveTokens(tokens);
  return record;
}

async function getAllTokens() {
  return await loadTokens();
}

async function removeToken(fcmToken) {
  const tokens = await loadTokens();
  const filtered = tokens.filter(t => t.token !== fcmToken);
  await saveTokens(filtered);
  return true;
}

module.exports = { addOrUpdateToken, getAllTokens, removeToken };

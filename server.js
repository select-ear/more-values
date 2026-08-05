import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');
const TESTS_DIR = path.join(DATA_DIR, 'tests');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure JWT secret exists
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (fs.existsSync(SECRET_FILE)) {
    JWT_SECRET = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf8')).secret;
  } else {
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(SECRET_FILE, JSON.stringify({ secret: JWT_SECRET }), 'utf8');
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to generate short 6-char random ID
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null; // Proceed as guest
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username }
  } catch (err) {
    req.user = null;
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
  next();
};

let db;

async function initDB() {
  db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE COLLATE NOCASE,
      password TEXT,
      bio TEXT,
      socialMedia TEXT,
      profilePicture TEXT
    );
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      ownerId TEXT,
      title TEXT,
      description TEXT,
      author TEXT,
      axisCount INTEGER,
      questionCount INTEGER,
      publishedAt TEXT,
      document TEXT,
      isDraft INTEGER DEFAULT 0,
      FOREIGN KEY(ownerId) REFERENCES users(id)
    );
  `);

  try {
    await db.exec('ALTER TABLE users ADD COLUMN bio TEXT;');
    await db.exec('ALTER TABLE users ADD COLUMN socialMedia TEXT;');
    await db.exec('ALTER TABLE users ADD COLUMN profilePicture TEXT;');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE tests ADD COLUMN isDraft INTEGER DEFAULT 0;');
  } catch (e) {}

  // Migration Logic: Check if users.json exists
  if (fs.existsSync(USERS_FILE)) {
    console.log('Migrating users.json to SQLite...');
    const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    for (const u of usersData) {
      await db.run('INSERT OR IGNORE INTO users (id, username, password) VALUES (?, ?, ?)', [u.id, u.username, u.password]);
    }
    fs.renameSync(USERS_FILE, USERS_FILE + '.migrated');
  }

  // Migration Logic: Check if tests dir exists
  if (fs.existsSync(TESTS_DIR)) {
    console.log('Migrating tests to SQLite...');
    const files = fs.readdirSync(TESTS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(TESTS_DIR, file), 'utf8');
      const data = JSON.parse(content);
      const qId = data.id || file.replace('.json', '');
      
      await db.run(`
        INSERT OR IGNORE INTO tests (id, ownerId, title, description, author, axisCount, questionCount, publishedAt, document)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        qId,
        data.ownerId || null,
        data.title || 'Untitled',
        data.description || '',
        data.author || 'Anonymous',
        data.axes?.length || 0,
        data.questions?.length || 0,
        data.publishedAt || new Date().toISOString(),
        content
      ]);
    }
    fs.renameSync(TESTS_DIR, TESTS_DIR + '_migrated');
  }
}

// ---------------- API ENDPOINTS ---------------- //

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, error: 'Username and password required' });
    
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username already taken' });
    }

    const id = generateId();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.run('INSERT INTO users (id, username, password) VALUES (?, ?, ?)', [id, username, hashedPassword]);

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id, username } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.get('SELECT id, username, password FROM users WHERE username = ?', [username]);
    
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/profile/:username', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT id, username, bio, socialMedia, profilePicture FROM users WHERE username = ? COLLATE NOCASE', [req.params.username]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const isOwner = req.user && req.user.id === user.id;
    const draftCondition = isOwner ? '' : 'AND (q.isDraft = 0 OR q.isDraft IS NULL)';

    const tests = await db.all(`
      SELECT q.id, q.title, q.description, q.author, q.ownerId, q.axisCount, q.questionCount, q.publishedAt, u.username as ownerUsername, q.isDraft
      FROM tests q
      JOIN users u ON q.ownerId = u.id
      WHERE u.id = ? ${draftCondition}
      ORDER BY q.publishedAt DESC
    `, [user.id]);

    res.json({ success: true, profile: user, tests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/profile', authMiddleware, requireAuth, async (req, res) => {
  try {
    const { bio, socialMedia, profilePicture } = req.body;
    await db.run(`
      UPDATE users 
      SET bio = ?, socialMedia = ?, profilePicture = ?
      WHERE id = ?
    `, [bio || '', socialMedia || '', profilePicture || '', req.user.id]);
    
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tests', async (req, res) => {
  try {
    // Return all tests with the owner's username
    const tests = await db.all(`
      SELECT q.id, q.title, q.description, q.author, q.ownerId, q.axisCount, q.questionCount, q.publishedAt, u.username as ownerUsername
      FROM tests q
      LEFT JOIN users u ON q.ownerId = u.id
      WHERE q.isDraft = 0 OR q.isDraft IS NULL
      ORDER BY q.publishedAt DESC
    `);
    res.json({ success: true, tests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tests/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT document FROM tests WHERE id = ?', [req.params.id]);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    res.json({ success: true, test: JSON.parse(row.document) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/publish', authMiddleware, requireAuth, async (req, res) => {
  try {
    const test = req.body;
    if (!test || !test.title || !Array.isArray(test.axes) || !Array.isArray(test.questions)) {
      return res.status(400).json({ success: false, error: 'Invalid test payload' });
    }

    let testId = test.id && test.id !== '8values-classic' ? test.id : generateId();
    const isDraft = test.isDraft ? 1 : 0;
    
    // Check ownership if overwriting
    const existing = await db.get('SELECT ownerId FROM tests WHERE id = ?', [testId]);
    if (existing && existing.ownerId && existing.ownerId !== req.user.id) {
      // Not the owner! Fork it implicitly by giving it a new ID.
      testId = generateId();
    }

    const publishedTest = {
      ...test,
      id: testId,
      ownerId: req.user.id,
      publishedAt: test.publishedAt || new Date().toISOString()
    };

    const documentString = JSON.stringify(publishedTest);

    await db.run(`
      INSERT OR REPLACE INTO tests (id, ownerId, title, description, author, axisCount, questionCount, publishedAt, document, isDraft)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testId,
      req.user.id,
      publishedTest.title || 'Untitled',
      publishedTest.description || '',
      publishedTest.author || 'Anonymous',
      publishedTest.axes?.length || 0,
      publishedTest.questions?.length || 0,
      publishedTest.publishedAt,
      documentString,
      isDraft
    ]);

    res.json({
      success: true,
      id: testId,
      ownerId: req.user.id,
      message: 'Test published successfully!',
      shareUrl: `/test/${testId}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tests/:id', authMiddleware, requireAuth, async (req, res) => {
  try {
    const test = await db.get('SELECT ownerId FROM tests WHERE id = ?', [req.params.id]);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    if (test.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this test' });
    }
    
    await db.run('DELETE FROM tests WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Test deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`8values Publisher Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

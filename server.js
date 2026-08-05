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
const QUIZZES_DIR = path.join(DATA_DIR, 'quizzes');
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
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      ownerId TEXT,
      title TEXT,
      description TEXT,
      author TEXT,
      axisCount INTEGER,
      questionCount INTEGER,
      publishedAt TEXT,
      document TEXT,
      FOREIGN KEY(ownerId) REFERENCES users(id)
    );
  `);

  try {
    await db.exec('ALTER TABLE users ADD COLUMN bio TEXT;');
    await db.exec('ALTER TABLE users ADD COLUMN socialMedia TEXT;');
    await db.exec('ALTER TABLE users ADD COLUMN profilePicture TEXT;');
  } catch (e) {
    // Columns already exist
  }

  // Migration Logic: Check if users.json exists
  if (fs.existsSync(USERS_FILE)) {
    console.log('Migrating users.json to SQLite...');
    const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    for (const u of usersData) {
      await db.run('INSERT OR IGNORE INTO users (id, username, password) VALUES (?, ?, ?)', [u.id, u.username, u.password]);
    }
    fs.renameSync(USERS_FILE, USERS_FILE + '.migrated');
  }

  // Migration Logic: Check if quizzes dir exists
  if (fs.existsSync(QUIZZES_DIR)) {
    console.log('Migrating quizzes to SQLite...');
    const files = fs.readdirSync(QUIZZES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(QUIZZES_DIR, file), 'utf8');
      const data = JSON.parse(content);
      const qId = data.id || file.replace('.json', '');
      
      await db.run(`
        INSERT OR IGNORE INTO quizzes (id, ownerId, title, description, author, axisCount, questionCount, publishedAt, document)
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
    fs.renameSync(QUIZZES_DIR, QUIZZES_DIR + '_migrated');
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

app.get('/api/profile/:username', async (req, res) => {
  try {
    const user = await db.get('SELECT id, username, bio, socialMedia, profilePicture FROM users WHERE username = ? COLLATE NOCASE', [req.params.username]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const quizzes = await db.all(`
      SELECT q.id, q.title, q.description, q.author, q.ownerId, q.axisCount, q.questionCount, q.publishedAt, u.username as ownerUsername
      FROM quizzes q
      JOIN users u ON q.ownerId = u.id
      WHERE u.id = ?
      ORDER BY q.publishedAt DESC
    `, [user.id]);

    res.json({ success: true, profile: user, quizzes });
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

app.get('/api/quizzes', async (req, res) => {
  try {
    // Return all quizzes with the owner's username
    const quizzes = await db.all(`
      SELECT q.id, q.title, q.description, q.author, q.ownerId, q.axisCount, q.questionCount, q.publishedAt, u.username as ownerUsername
      FROM quizzes q
      LEFT JOIN users u ON q.ownerId = u.id
      ORDER BY q.publishedAt DESC
    `);
    res.json({ success: true, quizzes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT document FROM quizzes WHERE id = ?', [req.params.id]);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    res.json({ success: true, quiz: JSON.parse(row.document) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/publish', authMiddleware, requireAuth, async (req, res) => {
  try {
    const quiz = req.body;
    if (!quiz || !quiz.title || !Array.isArray(quiz.axes) || !Array.isArray(quiz.questions)) {
      return res.status(400).json({ success: false, error: 'Invalid quiz payload' });
    }

    let quizId = quiz.id && quiz.id !== '8values-classic' ? quiz.id : generateId();
    
    // Check ownership if overwriting
    const existing = await db.get('SELECT ownerId FROM quizzes WHERE id = ?', [quizId]);
    if (existing && existing.ownerId && existing.ownerId !== req.user.id) {
      // Not the owner! Fork it implicitly by giving it a new ID.
      quizId = generateId();
    }

    const publishedQuiz = {
      ...quiz,
      id: quizId,
      ownerId: req.user.id,
      publishedAt: quiz.publishedAt || new Date().toISOString()
    };

    const documentString = JSON.stringify(publishedQuiz);

    await db.run(`
      INSERT OR REPLACE INTO quizzes (id, ownerId, title, description, author, axisCount, questionCount, publishedAt, document)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      quizId,
      req.user.id,
      publishedQuiz.title || 'Untitled',
      publishedQuiz.description || '',
      publishedQuiz.author || 'Anonymous',
      publishedQuiz.axes?.length || 0,
      publishedQuiz.questions?.length || 0,
      publishedQuiz.publishedAt,
      documentString
    ]);

    res.json({
      success: true,
      id: quizId,
      ownerId: req.user.id,
      message: 'Quiz published successfully!',
      shareUrl: `/quiz/${quizId}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/quizzes/:id', authMiddleware, requireAuth, async (req, res) => {
  try {
    const quiz = await db.get('SELECT ownerId FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    if (quiz.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this quiz' });
    }
    
    await db.run('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Quiz deleted successfully' });
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

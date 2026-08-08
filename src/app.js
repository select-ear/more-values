/**
 * app.js
 * 
 * Main Express application configuration and route definitions.
 * This file handles all REST API endpoints for the 8values Publisher backend,
 * including user authentication, profile management, and test CRUD operations.
 */
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbManager } from './dbManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const SECRET_FILE = path.join(DATA_DIR, 'secret.json');

// Ensure storage directories exist only if we have filesystem access (fails silently on Vercel)
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    // Ignore, running in serverless read-only environment
  }
}

// Generate or load JWT Secret
let JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod';
if (!process.env.JWT_SECRET) {
  if (fs.existsSync(SECRET_FILE)) {
    const secretData = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf8'));
    JWT_SECRET = secretData.secret;
  } else {
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    try {
      fs.writeFileSync(SECRET_FILE, JSON.stringify({ secret: JWT_SECRET }));
    } catch (e) {
      console.warn("Could not save secret.json locally.");
    }
  }
}

function generateId() {
  return crypto.randomBytes(4).toString('hex');
}

export const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---------------- MIDDLEWARE ---------------- //

/**
 * authMiddleware
 * Extracts the JWT from the Authorization header and verifies it.
 * If valid, attaches the decoded user payload to req.user.
 * Does not block the request if the token is invalid or missing (use requireAuth for that).
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // invalid token, just clear user
    }
  }
  next();
};

/**
 * requireAuth
 * Middleware to enforce authentication. Must be used AFTER authMiddleware.
 * Blocks the request with a 401 Unauthorized if req.user is not set.
 */
const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  next();
};

// ---------------- API ENDPOINTS ---------------- //

/**
 * POST /api/register
 * Registers a new user account with a unique username and hashed password.
 */
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, error: 'Username and password required' });
    
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters' });
    }
    if (password.length < 6 || password.length > 100) {
      return res.status(400).json({ success: false, error: 'Password must be between 6 and 100 characters' });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' });
    }
    
    const existing = await dbManager.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username already taken' });
    }

    const id = generateId();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await dbManager.createUser(id, username, hashedPassword);

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id, username } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/login
 * Authenticates a user and returns a signed JWT token valid for 7 days.
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await dbManager.getUserByUsername(username);
    
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, requireAuth, async (req, res) => {
  try {
    const user = await dbManager.getUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/profile/:username
 * Fetches public profile data (bio, social media, avatar) and published tests
 * for a specific user.
 */
app.get('/api/profile/:username', async (req, res) => {
  try {
    const user = await dbManager.getUserByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const userTests = await dbManager.getTestsByOwner(user.id);
    
    res.json({
      success: true,
      profile: {
        username: user.username,
        bio: user.bio,
        socialMedia: user.socialMedia,
        profilePicture: user.profilePicture
      },
      tests: userTests.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        author: t.author,
        axisCount: t.axisCount,
        questionCount: t.questionCount,
        publishedAt: t.publishedAt,
        isDraft: t.isDraft
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/profile/:username/recycle-bin', authMiddleware, requireAuth, async (req, res) => {
  try {
    const user = await dbManager.getUserByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    if (user.id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const allTests = await dbManager.getTestsByOwner(user.id);
    const recycleBinTests = allTests.filter(t => t.deletedAt !== null);
    
    res.json({
      success: true,
      tests: recycleBinTests.map(t => ({
        id: t.id,
        title: t.title,
        deletedAt: t.deletedAt
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/profile
 * Updates the authenticated user's profile details (bio, social media, avatar).
 * Validates payload size and format for images.
 */
app.put('/api/profile', authMiddleware, requireAuth, async (req, res) => {
  try {
    const { bio, socialMedia, profilePicture } = req.body;
    
    if (bio && (typeof bio !== 'string' || bio.length > 500)) {
      return res.status(400).json({ success: false, error: 'Bio must be under 500 characters' });
    }
    
    if (socialMedia && (typeof socialMedia !== 'string' || socialMedia.length > 100)) {
      return res.status(400).json({ success: false, error: 'Social media link must be under 100 characters' });
    }
    
    if (socialMedia && !socialMedia.match(/^https?:\/\/.+/)) {
      return res.status(400).json({ success: false, error: 'Social media link must be a valid URL starting with http:// or https://' });
    }
    
    if (profilePicture && typeof profilePicture === 'string') {
      if (profilePicture.length > 7 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Profile picture payload is too large' });
      }
      if (!profilePicture.startsWith('data:image/') && !profilePicture.startsWith('https://api.dicebear.com/')) {
        return res.status(400).json({ success: false, error: 'Invalid profile picture format' });
      }
    }

    await dbManager.updateUserProfile(req.user.id, bio, socialMedia, profilePicture);
    
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tags
 * Fetches a list of all unique tags used across tests.
 */
app.get('/api/tags', async (req, res) => {
  try {
    const tags = await dbManager.getAllTags();
    res.json({ success: true, tags });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tests
 * Fetches a list of all publicly published tests from all users.
 */
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await dbManager.getPublishedTests();
    res.json({ success: true, tests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tests/by-slug/:username/:slug', async (req, res) => {
  try {
    const testData = await dbManager.getTestBySlug(req.params.username, req.params.slug);
    if (!testData) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    res.json({ success: true, test: testData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tests/:id', async (req, res) => {
  try {
    const testData = await dbManager.getTestById(req.params.id);
    if (!testData) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    res.json({ success: true, test: testData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tests/:id/view
 * Increments the view counter for a specific test.
 */
app.post('/api/tests/:id/view', async (req, res) => {
  try {
    await dbManager.incrementTestViews(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tests/:id/play
 * Increments the play counter for a specific test.
 */
app.post('/api/tests/:id/play', async (req, res) => {
  try {
    await dbManager.incrementTestPlays(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/publish
 * Publishes or saves a draft of a test.
 * If the user does not own the test (e.g. forking someone else's test),
 * it implicitly generates a new test ID and assigns ownership to the caller.
 * Validates the complete structure of the test JSON (axes, questions, ideologies).
 */
app.post('/api/publish', authMiddleware, requireAuth, async (req, res) => {
  try {
    const test = req.body;
    if (!test || !test.title || !Array.isArray(test.axes) || !Array.isArray(test.questions)) {
      return res.status(400).json({ success: false, error: 'Invalid test payload' });
    }

    if (typeof test.title !== 'string' || test.title.length < 1 || test.title.length > 100) {
      return res.status(400).json({ success: false, error: 'Title must be between 1 and 100 characters' });
    }
    if (test.description && (typeof test.description !== 'string' || test.description.length > 2000)) {
      return res.status(400).json({ success: false, error: 'Description must be under 2000 characters' });
    }
    if (test.axes.length < 2 || test.axes.length > 20) {
      return res.status(400).json({ success: false, error: 'Test must have between 2 and 20 axes' });
    }
    if (test.questions.length < 1 || test.questions.length > 250) {
      return res.status(400).json({ success: false, error: 'Test must have between 1 and 250 questions' });
    }
    if (test.ideologies && (!Array.isArray(test.ideologies) || test.ideologies.length > 100)) {
      return res.status(400).json({ success: false, error: 'Test cannot exceed 100 ideologies' });
    }
    if (test.tags) {
      if (!Array.isArray(test.tags) || test.tags.length > 5) {
        return res.status(400).json({ success: false, error: 'Test cannot exceed 5 tags' });
      }
      for (const tag of test.tags) {
        if (typeof tag !== 'string' || tag.length > 30) {
          return res.status(400).json({ success: false, error: 'Tags must be strings under 30 characters' });
        }
      }
    }
    if (test.thumbnail) {
      if (typeof test.thumbnail !== 'string' || test.thumbnail.length > 3 * 1024 * 1024 || !test.thumbnail.startsWith('data:image/')) {
        return res.status(400).json({ success: false, error: 'Invalid thumbnail format or size' });
      }
    }
    if (test.favicon) {
      if (typeof test.favicon !== 'string' || test.favicon.length > 3 * 1024 * 1024 || !test.favicon.startsWith('data:image/')) {
        return res.status(400).json({ success: false, error: 'Invalid favicon format or size' });
      }
    }

    let testId = test.id && test.id !== '8values-classic' ? test.id : generateId();
    const isDraft = test.isDraft ? 1 : 0;
    
    // Check ownership if overwriting
    const existingOwner = await dbManager.getTestOwnerId(testId);
    if (existingOwner && existingOwner !== req.user.id) {
      // Not the owner! Fork it implicitly by giving it a new ID.
      testId = generateId();
    }

    // Check for unique title for this user
    const existingTitleRow = await dbManager.checkTitleExistsForUser(req.user.id, test.title, testId);
    if (existingTitleRow) {
      return res.status(400).json({ success: false, error: `You already have a test named "${test.title}". Please choose a unique name.` });
    }

    const publishedTest = {
      ...test,
      id: testId,
      ownerId: req.user.id,
      publishedAt: test.publishedAt || new Date().toISOString()
    };

    await dbManager.saveTest(testId, req.user.id, publishedTest, isDraft);

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

/**
 * DELETE /api/tests/:id
 * Soft deletes a test (moves it to the recycle bin by setting deletedAt).
 */
app.delete('/api/tests/:id', authMiddleware, requireAuth, async (req, res) => {
  try {
    const ownerId = await dbManager.getTestOwnerId(req.params.id);
    if (!ownerId) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    if (ownerId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this test' });
    }
    
    await dbManager.deleteTestSoft(req.params.id);
    res.json({ success: true, message: 'Test moved to recycle bin' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/tests/:id/permanent
 * Permanently deletes a test from the database. Cannot be undone.
 */
app.delete('/api/tests/:id/permanent', authMiddleware, requireAuth, async (req, res) => {
  try {
    const ownerId = await dbManager.getTestOwnerId(req.params.id);
    if (!ownerId) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    if (ownerId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this test' });
    }
    
    await dbManager.deleteTestPermanent(req.params.id);
    res.json({ success: true, message: 'Test permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tests/:id/restore
 * Restores a soft-deleted test from the recycle bin back to the published or drafted state.
 */
app.post('/api/tests/:id/restore', authMiddleware, requireAuth, async (req, res) => {
  try {
    const ownerId = await dbManager.getTestOwnerId(req.params.id);
    if (!ownerId) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    if (ownerId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this test' });
    }
    
    await dbManager.restoreTest(req.params.id);
    res.json({ success: true, message: 'Test restored successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

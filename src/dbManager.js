import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async init(filename = DB_FILE) {
    // Ensure data directory exists if using a file path in the data dir
    if (filename.includes(DATA_DIR) && !fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    this.db = await open({
      filename,
      driver: sqlite3.Database
    });

    await this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE COLLATE NOCASE,
        password TEXT,
        bio TEXT,
        socialMedia TEXT,
        profilePicture TEXT
      );
    `);

    await this.db.run(`
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
        deletedAt TEXT,
        FOREIGN KEY(ownerId) REFERENCES users(id)
      );
    `);
    
    return this.db;
  }
  
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.db;
  }

  // --- Users ---
  
  async getUserByUsername(username) {
    return await this.getDb().get('SELECT * FROM users WHERE username = ?', [username]);
  }

  async getUserById(id) {
    return await this.getDb().get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async createUser(id, username, passwordHash) {
    await this.getDb().run(
      'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
      [id, username, passwordHash]
    );
  }

  async updateUserProfile(id, bio, socialMedia, profilePicture) {
    await this.getDb().run(`
      UPDATE users 
      SET bio = ?, socialMedia = ?, profilePicture = ?
      WHERE id = ?
    `, [bio || '', socialMedia || '', profilePicture || '', id]);
  }

  // --- Tests ---

  async getPublishedTests() {
    return await this.getDb().all(`
      SELECT q.id, q.title, q.description, q.author, q.axisCount, q.questionCount, q.publishedAt, u.username as ownerUsername
      FROM tests q
      LEFT JOIN users u ON q.ownerId = u.id
      WHERE (q.isDraft = 0 OR q.isDraft IS NULL) AND q.deletedAt IS NULL
      ORDER BY q.publishedAt DESC
    `);
  }

  async getTestBySlug(username, slug) {
    const row = await this.getDb().get(`
      SELECT t.document, t.id
      FROM tests t
      JOIN users u ON t.ownerId = u.id
      WHERE LOWER(u.username) = LOWER(?)
        AND REPLACE(t.title, ' ', '-') = ?
        AND t.isDraft = 0
        AND t.deletedAt IS NULL
      ORDER BY t.publishedAt DESC
      LIMIT 1
    `, [username, slug]);
    
    if (row) {
      const testData = JSON.parse(row.document);
      testData.id = row.id;
      return testData;
    }
    return null;
  }

  async getTestById(id) {
    const row = await this.getDb().get('SELECT document FROM tests WHERE id = ?', [id]);
    return row ? JSON.parse(row.document) : null;
  }

  async getTestOwnerId(id) {
    const row = await this.getDb().get('SELECT ownerId FROM tests WHERE id = ?', [id]);
    return row ? row.ownerId : null;
  }

  async checkTitleExistsForUser(ownerId, title, excludeTestId) {
    return await this.getDb().get(
      'SELECT id FROM tests WHERE ownerId = ? AND title = ? AND id != ? AND deletedAt IS NULL', 
      [ownerId, title, excludeTestId]
    );
  }

  async saveTest(testId, ownerId, test, isDraft) {
    const documentString = JSON.stringify(test);
    await this.getDb().run(`
      INSERT OR REPLACE INTO tests (id, ownerId, title, description, author, axisCount, questionCount, publishedAt, document, isDraft)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testId,
      ownerId,
      test.title || 'Untitled',
      test.description || '',
      test.author || 'Anonymous',
      test.axes?.length || 0,
      test.questions?.length || 0,
      test.publishedAt,
      documentString,
      isDraft
    ]);
  }

  async deleteTestSoft(id) {
    const now = new Date().toISOString();
    await this.getDb().run('UPDATE tests SET deletedAt = ? WHERE id = ?', [now, id]);
  }

  async deleteTestPermanent(id) {
    await this.getDb().run('DELETE FROM tests WHERE id = ?', [id]);
  }

  async restoreTest(id) {
    await this.getDb().run('UPDATE tests SET deletedAt = NULL WHERE id = ?', [id]);
  }

  async getTestsByOwner(ownerId) {
    return await this.getDb().all(`
      SELECT q.id, q.title, q.description, q.author, q.axisCount, q.questionCount, q.publishedAt, q.isDraft, q.deletedAt
      FROM tests q
      WHERE q.ownerId = ?
      ORDER BY q.publishedAt DESC
    `, [ownerId]);
  }

  async cleanupRecycleBin() {
    await this.getDb().run(`DELETE FROM tests WHERE deletedAt IS NOT NULL AND deletedAt < datetime('now', '-30 days')`);
  }
}

export const dbManager = new DatabaseManager();

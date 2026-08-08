/**
 * dbManager.js
 * 
 * Provides a Data Access Object (DAO) pattern around the database.
 * Supports both local SQLite and remote Turso via @libsql/client.
 */
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  /**
   * Initializes the database connection and sets up the schema.
   * If TURSO_DATABASE_URL is provided, it connects to Turso.
   * Otherwise, it defaults to a local file database.
   */
  async init(filename = DB_FILE) {
    if (filename.includes(DATA_DIR) && !fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    const url = process.env.TURSO_DATABASE_URL || `file:${filename}`;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    this.db = createClient({
      url,
      authToken
    });

    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        bio TEXT,
        socialMedia TEXT,
        profilePicture TEXT
      );
    `);

    await this.run(`
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
    
    // Dynamically add columns for engagement and tags if they don't exist
    const columns = await this.all("PRAGMA table_info(tests)");
    const colNames = columns.map(c => c.name);
    
    if (!colNames.includes('views')) {
      await this.run("ALTER TABLE tests ADD COLUMN views INTEGER DEFAULT 0");
    }
    if (!colNames.includes('plays')) {
      await this.run("ALTER TABLE tests ADD COLUMN plays INTEGER DEFAULT 0");
    }
    if (!colNames.includes('tags')) {
      await this.run("ALTER TABLE tests ADD COLUMN tags TEXT DEFAULT '[]'");
    }

    return this.db;
  }
  
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // --- Core Query Wrappers ---

  async run(sql, args = []) {
    if (!this.db) throw new Error("Database not initialized.");
    return await this.db.execute({ sql, args });
  }

  async get(sql, args = []) {
    if (!this.db) throw new Error("Database not initialized.");
    const res = await this.db.execute({ sql, args });
    return res.rows.length > 0 ? res.rows[0] : undefined;
  }

  async all(sql, args = []) {
    if (!this.db) throw new Error("Database not initialized.");
    const res = await this.db.execute({ sql, args });
    return res.rows;
  }

  // --- Users ---
  
  async getUserByUsername(username) {
    // Note: SQLite COLLATE NOCASE isn't natively standard in all SQL engines, but works in Turso/libsql.
    // Using LOWER for safety across queries.
    return await this.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
  }

  async getUserById(id) {
    return await this.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async createUser(id, username, passwordHash) {
    await this.run(
      'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
      [id, username, passwordHash]
    );
  }

  async updateUserProfile(id, bio, socialMedia, profilePicture) {
    await this.run(`
      UPDATE users 
      SET bio = ?, socialMedia = ?, profilePicture = ?
      WHERE id = ?
    `, [bio || '', socialMedia || '', profilePicture || '', id]);
  }

  // --- Tests ---

  async getPublishedTests() {
    return await this.all(`
      SELECT q.id, q.title, q.description, q.author, q.axisCount, q.questionCount, q.publishedAt, q.views, q.plays, q.tags, u.username as ownerUsername
      FROM tests q
      LEFT JOIN users u ON q.ownerId = u.id
      WHERE (q.isDraft = 0 OR q.isDraft IS NULL) AND q.deletedAt IS NULL
      ORDER BY q.publishedAt DESC
    `);
  }

  async getTestBySlug(username, slug) {
    const row = await this.get(`
      SELECT t.document, t.id, u.username as ownerUsername
      FROM tests t
      JOIN users u ON t.ownerId = u.id
      WHERE LOWER(u.username) = LOWER(?)
        AND REPLACE(LOWER(t.title), ' ', '-') = LOWER(?)
        AND t.isDraft = 0
        AND t.deletedAt IS NULL
      ORDER BY t.publishedAt DESC
      LIMIT 1
    `, [username, slug]);
    
    if (row) {
      const testData = JSON.parse(row.document);
      testData.id = row.id;
      testData.ownerUsername = row.ownerUsername;
      return testData;
    }
    return null;
  }

  async getTestById(id) {
    const row = await this.get(`
      SELECT t.document, u.username as ownerUsername 
      FROM tests t 
      LEFT JOIN users u ON t.ownerId = u.id 
      WHERE t.id = ?
    `, [id]);
    if (row) {
      const testData = JSON.parse(row.document);
      if (row.ownerUsername) testData.ownerUsername = row.ownerUsername;
      return testData;
    }
    return null;
  }

  async getTestOwnerId(id) {
    const row = await this.get('SELECT ownerId FROM tests WHERE id = ?', [id]);
    return row ? row.ownerId : null;
  }

  async checkTitleExistsForUser(ownerId, title, excludeTestId) {
    return await this.get(
      'SELECT id FROM tests WHERE ownerId = ? AND LOWER(title) = LOWER(?) AND id != ? AND deletedAt IS NULL', 
      [ownerId, title, excludeTestId]
    );
  }

  async saveTest(testId, ownerId, test, isDraft) {
    const documentString = JSON.stringify(test);
    const tagsString = JSON.stringify(test.tags || []);
    await this.run(`
      INSERT OR REPLACE INTO tests (id, ownerId, title, description, author, axisCount, questionCount, publishedAt, document, isDraft, tags, views, plays)
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        COALESCE((SELECT views FROM tests WHERE id = ?), 0),
        COALESCE((SELECT plays FROM tests WHERE id = ?), 0)
      )
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
      isDraft,
      tagsString,
      testId,
      testId
    ]);
  }

  async deleteTestSoft(id) {
    const now = new Date().toISOString();
    await this.run('UPDATE tests SET deletedAt = ? WHERE id = ?', [now, id]);
  }

  async deleteTestPermanent(id) {
    await this.run('DELETE FROM tests WHERE id = ?', [id]);
  }

  async restoreTest(id) {
    await this.run('UPDATE tests SET deletedAt = NULL WHERE id = ?', [id]);
  }

  async getTestsByOwner(ownerId) {
    return await this.all(`
      SELECT q.id, q.title, q.description, q.author, q.axisCount, q.questionCount, q.publishedAt, q.isDraft, q.deletedAt, q.views, q.plays, q.tags
      FROM tests q
      WHERE q.ownerId = ?
      ORDER BY q.publishedAt DESC
    `, [ownerId]);
  }

  async cleanupRecycleBin() {
    await this.run(`DELETE FROM tests WHERE deletedAt IS NOT NULL AND deletedAt < datetime('now', '-30 days')`);
  }

  async incrementTestViews(id) {
    await this.run('UPDATE tests SET views = views + 1 WHERE id = ?', [id]);
  }

  async incrementTestPlays(id) {
    await this.run('UPDATE tests SET plays = plays + 1 WHERE id = ?', [id]);
  }

  async getAllTags() {
    const rows = await this.all("SELECT tags FROM tests WHERE tags IS NOT NULL AND tags != '[]'");
    const tagsSet = new Set(['politics', 'leftism', 'rightism']);
    rows.forEach(row => {
      try {
        const parsed = JSON.parse(row.tags);
        if (Array.isArray(parsed)) {
          parsed.forEach(t => {
            if (t && typeof t === 'string') tagsSet.add(t.toLowerCase().trim());
          });
        }
      } catch (e) {}
    });
    return Array.from(tagsSet);
  }
}

export const dbManager = new DatabaseManager();

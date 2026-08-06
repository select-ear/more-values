import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { dbManager } from '../src/dbManager.js';

let authToken = '';

beforeAll(async () => {
  // Use in-memory SQLite database for testing
  await dbManager.init(':memory:');
});

afterAll(async () => {
  await dbManager.close();
});

describe('Authentication API', () => {
  it('should reject registration with a short username', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'ab', password: 'password123' });
      
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('between 3 and 20 characters');
  });

  it('should reject registration with invalid characters', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'hello world!', password: 'password123' });
      
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('only contain letters, numbers');
  });

  it('should successfully register a valid user', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'testuser', password: 'password123' });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    
    // Save token for future authenticated requests
    authToken = res.body.token;
  });
});

describe('Profile API', () => {
  it('should reject updating profile with invalid social media url', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ socialMedia: 'invalid-url' });
      
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('valid URL');
  });
  
  it('should allow updating profile with valid data', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bio: 'Hello World', socialMedia: 'https://twitter.com/test' });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Publish API', () => {
  it('should reject publishing a test without axes or questions', async () => {
    const res = await request(app)
      .post('/api/publish')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'My Test' });
      
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid test payload');
  });

  it('should reject publishing a test with too few axes', async () => {
    const res = await request(app)
      .post('/api/publish')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'My Test', axes: [{}], questions: [{}] });
      
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('between 2 and 20 axes');
  });

  it('should successfully publish a valid test', async () => {
    const res = await request(app)
      .post('/api/publish')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'My Valid Test',
        axes: [
          { id: '1', left: { name: 'A' }, right: { name: 'B' } },
          { id: '2', left: { name: 'C' }, right: { name: 'D' } }
        ],
        questions: [
          { text: 'Question 1', effect: {} }
        ]
      });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBeDefined();
  });
  
  it('should reject publishing another test with the exact same title', async () => {
    const res = await request(app)
      .post('/api/publish')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'My Valid Test', // Duplicate
        axes: [
          { id: '1', left: { name: 'A' }, right: { name: 'B' } },
          { id: '2', left: { name: 'C' }, right: { name: 'D' } }
        ],
        questions: [
          { text: 'Question 2', effect: {} }
        ]
      });
      
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already have a test named');
  });
});

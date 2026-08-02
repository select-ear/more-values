import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const QUIZZES_DIR = path.join(__dirname, 'data', 'quizzes');

// Ensure storage directory exists
if (!fs.existsSync(QUIZZES_DIR)) {
  fs.mkdirSync(QUIZZES_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to generate short 6-char random ID
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// GET all published public quizzes
app.get('/api/quizzes', (req, res) => {
  try {
    const files = fs.readdirSync(QUIZZES_DIR);
    const quizzes = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(path.join(QUIZZES_DIR, file), 'utf8');
        const data = JSON.parse(content);
        return {
          id: data.id || file.replace('.json', ''),
          title: data.title,
          description: data.description,
          author: data.author || 'Anonymous',
          axisCount: data.axes?.length || 0,
          questionCount: data.questions?.length || 0,
          publishedAt: data.publishedAt || new Date().toISOString()
        };
      });
    res.json({ success: true, quizzes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET specific quiz by ID
app.get('/api/quizzes/:id', (req, res) => {
  try {
    const filePath = path.join(QUIZZES_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ success: true, quiz: JSON.parse(content) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST publish new quiz
app.post('/api/publish', (req, res) => {
  try {
    const quiz = req.body;
    if (!quiz || !quiz.title || !Array.isArray(quiz.axes) || !Array.isArray(quiz.questions)) {
      return res.status(400).json({ success: false, error: 'Invalid quiz payload' });
    }

    const quizId = quiz.id && quiz.id !== '8values-classic' ? quiz.id : generateId();
    const publishedQuiz = {
      ...quiz,
      id: quizId,
      publishedAt: new Date().toISOString()
    };

    const filePath = path.join(QUIZZES_DIR, `${quizId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(publishedQuiz, null, 2), 'utf8');

    res.json({
      success: true,
      id: quizId,
      message: 'Quiz published successfully!',
      shareUrl: `/quiz/${quizId}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`8values Publisher Backend running on http://localhost:${PORT}`);
});

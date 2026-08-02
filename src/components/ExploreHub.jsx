import React, { useState, useEffect } from 'react';
import { Search, Play, GitFork, Download, Sparkles, Globe } from 'lucide-react';
import { DEFAULT_8VALUES_QUIZ } from '../utils/default8values';

export function ExploreHub({ onSelectQuiz, onEditQuiz }) {
  const [quizzes, setQuizzes] = useState([DEFAULT_8VALUES_QUIZ]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt to load community published quizzes from backend API
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:4000/api/quizzes');
        const data = await res.json();
        if (data.success && Array.isArray(data.quizzes)) {
          // Merge API quizzes with default 8values
          const merged = [
            DEFAULT_8VALUES_QUIZ,
            ...data.quizzes.filter(q => q.id !== '8values-classic')
          ];
          setQuizzes(merged);
        }
      } catch (err) {
        // Backend server offline, fallback to preset quizzes
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  const filteredQuizzes = quizzes.filter(q =>
    q.title?.toLowerCase().includes(search.toLowerCase()) ||
    q.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1>∞Values</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '650px', margin: '0.5rem auto' }}>
          Explore all the tests made by our community, or create your own in the Creator tab!
        </p>

        {/* Search Input */}
        <div style={{ position: 'relative', maxWidth: '500px', margin: '1.5rem auto' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search quizzes by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Quizzes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {filteredQuizzes.map((quiz) => (
          <div key={quiz.id} className="axis-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden', 
            padding: 0,
            backgroundColor: 'var(--container-bg, #eeeeee)',
            borderRadius: '8pt'
          }}>
            {/* Thumbnail Banner */}
            <div style={{ width: '100%', height: '160px', backgroundColor: 'var(--bg-color)' }}>
              <img 
                src={quiz.thumbnail || '/placeholder.jpg'} 
                alt={`${quiz.title} thumbnail`} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={(e) => { e.target.src = '/placeholder.jpg'; }} // fallback if missing
              />
            </div>
            
            {/* Card Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', textAlign: 'left' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className="badge">
                    {quiz.id === '8values-classic' ? 'Featured Preset' : 'Community Hosted'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {quiz.axes?.length || quiz.axisCount || 4} Axes • {quiz.questions?.length || quiz.questionCount || 0} Questions
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                  {quiz.title}
                </h3>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  {quiz.description}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => onSelectQuiz(quiz)}
                >
                  <Play size={14} /> Do Test
                </button>

                <button
                  className="btn btn-sm btn-fork"
                  onClick={() => onEditQuiz(quiz)}
                  title="Fork & Edit this Quiz in Creator"
                >
                  <GitFork size={14} /> Fork
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

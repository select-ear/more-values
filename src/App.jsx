import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ExploreHub } from './components/ExploreHub';
import { QuizPlayer } from './components/QuizPlayer';
import { QuizResults } from './components/QuizResults';
import { Studio } from './components/Studio/Studio';
import { DEFAULT_8VALUES_QUIZ } from './utils/default8values';
import { decodeQuizFromUrlHash, downloadQuizJson, parseQuizJsonFile } from './utils/compressor';
import { AuthModal } from './components/AuthModal';
import { ProfilePage } from './components/ProfilePage';

export default function App() {
  const [activeTab, setActiveTab] = useState('explore');
  const [currentQuiz, setCurrentQuiz] = useState(DEFAULT_8VALUES_QUIZ);
  const [quizResults, setQuizResults] = useState(null);
  const [isThemeEditMode, setIsThemeEditMode] = useState(false);
  const [viewingUsername, setViewingUsername] = useState(null);
  
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('8values_user');
    const storedToken = localStorage.getItem('8values_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setAuthToken(storedToken);
    }
  }, []);

  const handleLoginSuccess = (userData, tokenData) => {
    setUser(userData);
    setAuthToken(tokenData);
    localStorage.setItem('8values_user', JSON.stringify(userData));
    localStorage.setItem('8values_token', tokenData);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('8values_user');
    localStorage.removeItem('8values_token');
  };

  const handleUpdateTheme = (field, value) => {
    setCurrentQuiz(prev => ({
      ...prev,
      theme: { ...(prev.theme || DEFAULT_8VALUES_QUIZ.theme), [field]: value }
    }));
  };

  useEffect(() => {
    let t = DEFAULT_8VALUES_QUIZ.theme;
    if (activeTab === 'play' || activeTab === 'results') {
      t = currentQuiz.theme || DEFAULT_8VALUES_QUIZ.theme;
    }
    
    document.body.style.backgroundColor = t.background;
    document.documentElement.style.setProperty('--bg-primary', t.background);
    document.documentElement.style.setProperty('--heading-color', t.headings);
    document.documentElement.style.setProperty('--text-color', t.text);
    document.documentElement.style.setProperty('--line-color', t.lines);
    document.documentElement.style.setProperty('--container-bg', t.containerBg);
    document.documentElement.style.setProperty('--border-color', t.border);
    document.documentElement.style.setProperty('--results-bar-bg', t.resultsBarBg);
    document.documentElement.style.setProperty('--html-bg', t.htmlBg);
    document.documentElement.style.setProperty('--center-bg', t.centerBg);
    document.documentElement.style.backgroundColor = t.htmlBg;
  }, [currentQuiz.theme, activeTab]);

  const fileInputRef = useRef(null);

  // Read URL Hash for shared payload on startup
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('#quiz=')) {
        const quizParam = hash.replace('#quiz=', '');

        // Check if hash is short backend ID or compressed string payload
        if (quizParam.length < 12) {
          fetch(`http://localhost:4000/api/quizzes/${quizParam}`)
            .then(r => r.json())
            .then(data => {
              if (data.success && data.quiz) {
                setCurrentQuiz(data.quiz);
                setActiveTab('play');
              }
            })
            .catch(err => console.error("Error loading server quiz ID:", err));
        } else {
          const decoded = decodeQuizFromUrlHash(hash);
          if (decoded) {
            setCurrentQuiz(decoded);
            setActiveTab('play');
          }
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);



  const handleSelectQuiz = async (quizSummary) => {
    if (quizSummary.id === '8values-classic') {
      setCurrentQuiz(DEFAULT_8VALUES_QUIZ);
      setActiveTab('play');
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/quizzes/${quizSummary.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentQuiz(data.quiz);
        setActiveTab('play');
      } else {
        alert('Could not load quiz data.');
      }
    } catch (err) {
      alert('Could not connect to server.');
    }
  };

  const handleEditQuiz = async (quizSummary) => {
    if (quizSummary.id === '8values-classic') {
      setCurrentQuiz(DEFAULT_8VALUES_QUIZ);
      setActiveTab('studio');
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/quizzes/${quizSummary.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentQuiz(data.quiz);
        setActiveTab('studio');
      } else {
        alert('Could not load quiz data.');
      }
    } catch (err) {
      alert('Could not connect to server.');
    }
  };

  const handleQuizComplete = (results) => {
    setQuizResults(results);
    setActiveTab('results');
  };

  const handleExportJson = () => {
    downloadQuizJson(currentQuiz);
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const loadedQuiz = await parseQuizJsonFile(file);
        setCurrentQuiz(loadedQuiz);
        setActiveTab('play');
      } catch (err) {
        alert("Failed to load .8val.json file: " + err.message);
      }
    }
  };

  const handlePublishQuiz = async (quizToPublish) => {
    try {
      const response = await fetch('http://localhost:4000/api/publish', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(quizToPublish)
      });
      return await response.json();
    } catch (err) {
      alert("Could not reach backend server. Using fallback zero-backend compressed URL link.");
      return { success: false };
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className={isThemeEditMode ? 'theme-edit-mode' : ''}>
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onExportJson={handleExportJson}
        onImportJsonClick={() => fileInputRef.current?.click()} 
        user={user}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={handleLogout}
        onViewProfile={() => {
          setViewingUsername(user.username);
          setActiveTab('profile');
        }}
      />

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onLoginSuccess={handleLoginSuccess} 
        />
      )}

      {/* Hidden File Input for Loading .8val.json files */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,.8val.json"
        style={{ display: 'none' }}
        onChange={handleImportFileChange}
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'explore' && (
          <ExploreHub
            onSelectQuiz={handleSelectQuiz}
            onEditQuiz={handleEditQuiz}
            user={user}
            authToken={authToken}
            onViewProfile={(username) => {
              setViewingUsername(username);
              setActiveTab('profile');
            }}
          />
        )}

        {activeTab === 'play' && (
          <QuizPlayer
            quiz={currentQuiz}
            onComplete={handleQuizComplete}
            onEditInStudio={() => setActiveTab('studio')}
            isThemeEditMode={isThemeEditMode}
            onUpdateTheme={handleUpdateTheme}
          />
        )}

        {activeTab === 'results' && (
          <QuizResults
            quiz={currentQuiz}
            results={quizResults}
            onRetake={() => setActiveTab('play')}
            onEditInStudio={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'studio' && (
          <Studio
            quiz={currentQuiz}
            setQuiz={setCurrentQuiz}
            onPlayQuiz={() => setActiveTab('play')}
            onSaveFile={handleExportJson}
            onPublish={handlePublishQuiz}
            isThemeEditMode={isThemeEditMode}
            setIsThemeEditMode={setIsThemeEditMode}
            user={user}
          />
        )}

        {activeTab === 'profile' && viewingUsername && (
          <ProfilePage
            username={viewingUsername}
            user={user}
            authToken={authToken}
            onSelectQuiz={handleSelectQuiz}
            onEditQuiz={handleEditQuiz}
            onGoBack={() => setActiveTab('explore')}
          />
        )}
      </main>
{/* 
      <hr />
      <footer style={{ textAlign: 'center', paddingBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        ∞Values
      </footer> */}

      {/* Global Theme Editor Floating Button */}
      {isThemeEditMode && (
        <button 
          className="exit-theme-btn"
          onClick={() => setIsThemeEditMode(false)} 
          style={{ 
            position: 'fixed', 
            bottom: '2rem', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 99999, 
            background: '#2196f3', 
            color: 'white', 
            border: 'none', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '50px', 
            fontWeight: 700, 
            cursor: 'pointer', 
            transition: 'all 0.2s ease', 
            fontFamily: "'Montserrat', sans-serif",
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
        >
          Exit theme editor
        </button>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ExploreHub } from './components/ExploreHub';
import { TestPlayer } from './components/TestPlayer';
import { TestResults } from './components/TestResults';
import { Studio } from './components/Studio/Studio';
import { DEFAULT_8VALUES_TEST } from './utils/default8values';
import { decodeTestFromUrlHash, downloadTestJson, parseTestJsonFile } from './utils/compressor';
import { AuthModal } from './components/AuthModal';
import { ProfilePage } from './components/ProfilePage';
import { useTestHistory } from './hooks/useTestHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState('explore');
  const { test: currentTest, setTest: setCurrentTest, undo, redo, canUndo, canRedo, resetHistory } = useTestHistory(DEFAULT_8VALUES_TEST);
  const [testResults, setTestResults] = useState(null);
  const [isThemeEditMode, setIsThemeEditMode] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
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
    setCurrentTest(prev => ({
      ...prev,
      theme: { ...(prev.theme || DEFAULT_8VALUES_TEST.theme), [field]: value }
    }));
  };

  useEffect(() => {
    if (activeTab === 'play' || activeTab === 'results') {
      const t = currentTest.theme || DEFAULT_8VALUES_TEST.theme;
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
    } else {
      document.body.style.backgroundColor = '';
      document.documentElement.style.removeProperty('--bg-primary');
      document.documentElement.style.removeProperty('--heading-color');
      document.documentElement.style.removeProperty('--text-color');
      document.documentElement.style.removeProperty('--line-color');
      document.documentElement.style.removeProperty('--container-bg');
      document.documentElement.style.removeProperty('--border-color');
      document.documentElement.style.removeProperty('--results-bar-bg');
      document.documentElement.style.removeProperty('--html-bg');
      document.documentElement.style.removeProperty('--center-bg');
      document.documentElement.style.backgroundColor = '';
    }
  }, [currentTest.theme, activeTab]);

  useEffect(() => {
    if (activeTab === 'play' || activeTab === 'results' || activeTab === 'studio') {
      document.title = currentTest?.title || '8values Publisher';
    } else if (activeTab === 'profile') {
      document.title = viewingUsername ? `${viewingUsername}'s Profile` : 'Profile';
    } else {
      document.title = '8values Publisher';
    }
  }, [activeTab, currentTest?.title, viewingUsername]);

  const fileInputRef = useRef(null);

  // Read URL Hash for shared payload on startup
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#/')) {
        const parts = hash.slice(2).split('/');
        if (parts.length === 2) {
          const username = parts[0];
          const slug = parts[1];
          if (username === '8values' && slug === 'classic') {
            setCurrentTest(DEFAULT_8VALUES_TEST);
            setActiveTab('play');
          } else {
            fetch(`http://localhost:4000/api/tests/by-slug/${username}/${slug}`)
              .then(r => r.json())
              .then(data => {
                if (data.success && data.test) {
                  setCurrentTest(data.test);
                  setActiveTab('play');
                }
              })
              .catch(err => console.error("Error loading server test slug:", err));
          }
        }
      } else if (hash && hash.includes('#test=')) {
        // Fallback for compressed string payload URLs
        const decoded = decodeTestFromUrlHash(hash);
        if (decoded) {
          setCurrentTest(decoded);
          setActiveTab('play');
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Clear URL hash when leaving the play tab so the link doesn't stick around
  useEffect(() => {
    if (activeTab !== 'play' && (window.location.hash.startsWith('#/') || window.location.hash.includes('#test='))) {
      window.history.pushState(null, '', window.location.pathname);
    }
  }, [activeTab]);

  const encodeSlug = (title) => {
    let slug = title.replace(/ /g, '-');
    return encodeURIComponent(slug).replace(/[!'()*]/g, function(c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  };

  const handleSelectTest = async (testSummary) => {
    setIsDemoMode(false);
    if (testSummary.id === '8values-classic') {
      resetHistory(DEFAULT_8VALUES_TEST);
      window.history.pushState(null, '', '#/8values/classic');
      setActiveTab('play');
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/tests/${testSummary.id}`);
      const data = await res.json();
      if (data.success) {
        resetHistory(data.test);
        const slug = encodeSlug(testSummary.title);
        const username = testSummary.ownerUsername || 'guest';
        window.history.pushState(null, '', `#/${username}/${slug}`);
        setActiveTab('play');
      } else {
        alert('Could not load test data.');
      }
    } catch (err) {
      alert('Could not connect to server.');
    }
  };

  const handleEditTest = async (testSummary) => {
    setIsDemoMode(false);
    if (testSummary.id === '8values-classic') {
      resetHistory(DEFAULT_8VALUES_TEST);
      setActiveTab('studio');
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/tests/${testSummary.id}`);
      const data = await res.json();
      if (data.success) {
        resetHistory(data.test);
        setActiveTab('studio');
      } else {
        alert('Could not load test data.');
      }
    } catch (err) {
      alert('Could not connect to server.');
    }
  };

  const handleTestComplete = (results) => {
    setTestResults(results);
    setActiveTab('results');
  };


  const handlePublishTest = async (testToPublish, isDraft = false) => {
    try {
      const response = await fetch('http://localhost:4000/api/publish', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ ...testToPublish, isDraft })
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



      <main style={{ flex: 1 }}>
        {activeTab === 'explore' && (
          <ExploreHub
            onSelectTest={handleSelectTest}
            onEditTest={handleEditTest}
            user={user}
            authToken={authToken}
            onViewProfile={(username) => {
              setViewingUsername(username);
              setActiveTab('profile');
            }}
          />
        )}

        {activeTab === 'play' && (
          <TestPlayer
            test={currentTest}
            onComplete={handleTestComplete}
            onEditInStudio={() => setActiveTab('studio')}
            isThemeEditMode={isThemeEditMode}
            onUpdateTheme={handleUpdateTheme}
          />
        )}

        {activeTab === 'results' && (
          <TestResults
            test={currentTest}
            results={testResults}
            onRetake={() => setActiveTab('play')}
            onEditInStudio={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'studio' && (
          <Studio
            test={currentTest}
            setTest={setCurrentTest}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onPlayTest={() => {
              setIsDemoMode(true);
              setActiveTab('play');
            }}
            onPublish={handlePublishTest}
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
            onSelectTest={handleSelectTest}
            onEditTest={handleEditTest}
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
          onClick={() => {
            setIsThemeEditMode(false);
            setActiveTab('studio');
          }} 
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

      {/* Global Exit Demo Floating Button */}
      {isDemoMode && !isThemeEditMode && (activeTab === 'play' || activeTab === 'results') && (
        <button 
          className="exit-demo-btn"
          onClick={() => {
            setIsDemoMode(false);
            setActiveTab('studio');
          }} 
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
          Exit Demo
        </button>
      )}
    </div>
  );
}

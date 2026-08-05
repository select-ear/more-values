import React from 'react';
import { Compass, Edit3, Play, Moon, Sun, Download, Upload } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, user, onLoginClick, onLogoutClick, onViewProfile }) {
  return (
    <header className="top-nav">
      <div className="top-brand" onClick={() => setActiveTab('explore')}>
        <span>∞Values</span>
      </div>

      <nav className="top-menu">
        <button
          className={`menu-btn ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          Browse Tests
        </button>

        <button
          className={`menu-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          Creator
        </button>



        {user ? (
          <>
            <button 
              className={`menu-btn ${activeTab === 'profile' ? 'active' : ''}`} 
              onClick={onViewProfile}
            >
              My Profile
            </button>
            <button className="menu-btn" onClick={onLogoutClick}>
              Sign Out
            </button>
          </>
        ) : (
          <button className="menu-btn" onClick={onLoginClick}>
            Sign In / Register
          </button>
        )}
      </nav>
    </header>
  );
}

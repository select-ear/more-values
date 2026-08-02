import React from 'react';
import { Compass, Edit3, Play, Moon, Sun, Download, Upload } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, onExportJson, onImportJsonClick }) {
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
          Explore Tests
        </button>

        {/* <button
          className={`menu-btn ${activeTab === 'play' ? 'active' : ''}`}
          onClick={() => setActiveTab('play')}
        >
          Do Test
        </button> */}

        <button
          className={`menu-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          Creator
        </button>

        <button className="menu-btn" onClick={onExportJson} title="Save Quiz JSON File">
          <Download size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Save .8val
        </button>

        <button className="menu-btn" onClick={onImportJsonClick} title="Load Quiz JSON File">
          <Upload size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Load .8val
        </button>


      </nav>
    </header>
  );
}

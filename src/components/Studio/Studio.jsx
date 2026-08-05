import React, { useState } from 'react';
import { Download, Upload, Play, Globe, RotateCcw, Save, Check, Palette, Image as ImageIcon, Trash2, Undo2, Redo2 } from 'lucide-react';
import { AxisEditor } from './AxisEditor';
import { QuestionEditor } from './QuestionEditor';
import { IdeologyEditor } from './IdeologyEditor';

export function Studio({ test, setTest, onPlayTest, onPublish, isThemeEditMode, setIsThemeEditMode, user, undo, redo, canUndo, canRedo }) {
  const [activeTab, setActiveTab] = useState('axes');
  const [publishing, setPublishing] = useState(false);
  const [publishedMsg, setPublishedMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // References for unmount auto-save
  const testRef = React.useRef(test);
  const userRef = React.useRef(user);
  const onPublishRef = React.useRef(onPublish);

  React.useEffect(() => {
    testRef.current = test;
    userRef.current = user;
    onPublishRef.current = onPublish;
  }, [test, user, onPublish]);

  React.useEffect(() => {
    return () => {
      const q = testRef.current;
      const u = userRef.current;
      const pub = onPublishRef.current;
      if (q && pub) {
        // Only auto-save if they are logged in, and they either own the test or it's new
        if (u && (!q.ownerId || q.ownerId === u.id)) {
          const isDraft = q.isDraft !== 0;
          pub(q, isDraft).catch(() => {});
        }
      }
    };
  }, []);

  // Keyboard shortcuts for Undo/Redo
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleMetadataChange = (field, value) => {
    setTest({ ...test, [field]: value });
  };

  const handleAxesChange = (axes) => {
    setTest({ ...test, axes });
  };

  const handleQuestionsChange = (questions) => {
    setTest({ ...test, questions });
  };

  const handleIdeologiesChange = (ideologies) => {
    setTest({ ...test, ideologies });
  };

  const handlePublishClick = async (isDraft) => {
    setPublishing(true);
    setPublishedMsg(null);
    setErrorMsg(null);
    try {
      const res = await onPublish(test, isDraft);
      if (res && res.success) {
        const isUpdate = test.ownerId && user && test.ownerId === user.id;
        let msg = isDraft ? 'Draft saved successfully!' : (isUpdate ? 'Changes saved and published!' : `Test published! Share URL: ${window.location.origin}/#test=${res.id}`);
        setPublishedMsg(msg);
        
        // Update local test state with the new ID and owner so subsequent clicks act as "Save"
        setTest({ ...test, id: res.id, ownerId: user?.id || null, isDraft: isDraft ? 1 : 0 });
      } else {
        setErrorMsg(res?.error || 'Failed to save changes.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error occurred.');
    } finally {
      setPublishing(false);
    }
  };

  const handleImageUpload = (e, field, maxWidth) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG for thumbnails, PNG for favicons (to preserve transparency)
        const format = field === 'favicon' ? 'image/png' : 'image/jpeg';
        const quality = field === 'favicon' ? 1.0 : 0.8;
        const dataUrl = canvas.toDataURL(format, quality);

        handleMetadataChange(field, dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };


  return (
    <div className="container">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div>
          <h1>Creator</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Design your test, customize colors, add questions, and publish.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.05)' }}>
            <button 
              style={{ border: 'none', background: 'transparent', padding: '0.5rem 0.75rem', color: canUndo ? 'var(--text-main)' : 'var(--text-muted)', cursor: canUndo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }} 
              onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <div style={{ width: '1px', background: 'var(--border-color)' }} />
            <button 
              style={{ border: 'none', background: 'transparent', padding: '0.5rem 0.75rem', color: canRedo ? 'var(--text-main)' : 'var(--text-muted)', cursor: canRedo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }} 
              onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => handlePublishClick(true)} disabled={publishing}>
            <Save size={16} /> {publishing ? 'Saving...' : 'Save Draft'}
          </button>
          
          <button className="btn btn-success btn-sm" onClick={onPlayTest}>
            <Play size={16} /> Demo Test
          </button>

          <button className="btn btn-primary btn-sm" onClick={() => handlePublishClick(false)} disabled={publishing}>
            <Globe size={16} /> {publishing ? 'Publishing...' : (test.ownerId && (!user || test.ownerId !== user.id) ? 'Fork & Publish' : 'Publish')}
          </button>
        </div>
      </div>

      {publishedMsg && (
        <div style={{ background: 'rgba(22, 163, 74, 0.15)', border: '1px solid #16a34a', color: '#4caf50', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={18} />
          {publishedMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(211, 47, 47, 0.15)', border: '1px solid #d32f2f', color: '#f44336', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 'bold' }}>Error:</span>
          {errorMsg}
        </div>
      )}

      {/* General Settings Card */}
      <div className="axis-card" style={{ textAlign: 'left', marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>General Test Settings</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Test Title</label>
            <input
              type="text"
              className="form-input"
              value={test.title || ''}
              onChange={(e) => handleMetadataChange('title', e.target.value)}
              placeholder="e.g. 8values Political Spectrum"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Author Name</label>
            <input
              type="text"
              className="form-input"
              value={test.author || ''}
              onChange={(e) => handleMetadataChange('author', e.target.value)}
              placeholder="Your name or organization"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            rows={2}
            className="form-textarea"
            value={test.description || ''}
            onChange={(e) => handleMetadataChange('description', e.target.value)}
            placeholder="Brief explanation of what this test measures..."
          />
        </div>
      </div>

      {/* Branding & Assets Card */}
      <div className="axis-card" style={{ textAlign: 'left', marginBottom: '2rem', padding: '1.5rem' }}>
        {/* <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImageIcon size={20} style={{ color: '#a78bfa' }} />
          Branding & Assets
        </h3> */}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {/* Thumbnail Upload */}
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Test Thumbnail (Cover Image)</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Displayed on the search page. (Recommended ratio 16:9)
              </p>
            </div>
            
            <label className="image-upload-wrapper" style={{ display: 'block', marginBottom: '1rem', border: test.thumbnail ? '1px solid var(--border-color)' : '2px dashed var(--border-color)', background: 'rgba(0,0,0,0.05)', aspectRatio: '16/9' }}>
              {test.thumbnail ? (
                <img src={test.thumbnail} alt="Thumbnail preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                </div>
              )}
              <div className="image-upload-overlay">
                <Upload size={24} style={{ marginBottom: '0.5rem' }} />
                {test.thumbnail ? 'Change Cover Image' : 'Upload Cover Image'}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'thumbnail', 600)} 
              />
            </label>

            {test.thumbnail && (
              <button 
                className="btn btn-danger btn-sm" 
                style={{ width: '100%', padding: '0.5rem' }}
                onClick={() => handleMetadataChange('thumbnail', null)}
              >
                <Trash2 size={16} /> Remove Cover Image
              </button>
            )}
          </div>

          {/* Favicon Upload */}
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Favicon (Small Icon)</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Displayed in the browser tab and small badges. (Square)
              </p>
            </div>

            <label className="image-upload-wrapper" style={{ display: 'block', marginBottom: '1rem', width: '80px', height: '80px', border: test.favicon ? '1px solid var(--border-color)' : '2px dashed var(--border-color)', background: 'rgba(0,0,0,0.05)' }}>
              {test.favicon ? (
                <img src={test.favicon} alt="Favicon preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={20} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                </div>
              )}
              <div className="image-upload-overlay" style={{ fontSize: '0.75rem' }}>
                <Upload size={16} style={{ marginBottom: '0.25rem' }} />
                Upload
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'favicon', 128)} 
              />
            </label>

            {test.favicon && (
              <button 
                className="btn btn-danger btn-sm" 
                style={{ width: '80px', padding: '0.25rem' }}
                onClick={() => handleMetadataChange('favicon', null)}
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>

          {/* Theme Colors */}
          <div>
            <label className="form-label">Custom Theme Colours</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Launch the live colour picker to customize the appearance of your test.
            </p>
            <button className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => {
              setIsThemeEditMode(true);
              onPlayTest();
            }}>
              <Palette size={16} /> Edit Theme Colors
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="studio-tabs">
        <button
          className={`studio-tab ${activeTab === 'axes' ? 'active' : ''}`}
          onClick={() => setActiveTab('axes')}
        >
          1. Axes & Values ({test.axes?.length || 0})
        </button>

        <button
          className={`studio-tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          2. Questions & Weights ({test.questions?.length || 0})
        </button>

        <button
          className={`studio-tab ${activeTab === 'ideologies' ? 'active' : ''}`}
          onClick={() => setActiveTab('ideologies')}
        >
          3. Ideologies ({test.ideologies?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'axes' && (
        <AxisEditor axes={test.axes || []} setAxes={handleAxesChange} />
      )}

      {activeTab === 'questions' && (
        <QuestionEditor questions={test.questions || []} setQuestions={handleQuestionsChange} axes={test.axes || []} />
      )}

      {activeTab === 'ideologies' && (
        <IdeologyEditor ideologies={test.ideologies || []} setIdeologies={handleIdeologiesChange} axes={test.axes || []} />
      )}
    </div>
  );
}

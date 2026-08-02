import React, { useState } from 'react';
import { Download, Upload, Play, Globe, RotateCcw, Save, Check, Palette, Image as ImageIcon, Trash2 } from 'lucide-react';
import { AxisEditor } from './AxisEditor';
import { QuestionEditor } from './QuestionEditor';
import { IdeologyEditor } from './IdeologyEditor';

export function Studio({ quiz, setQuiz, onPlayQuiz, onSaveFile, onPublish, isThemeEditMode, setIsThemeEditMode }) {
  const [activeTab, setActiveTab] = useState('axes');
  const [publishing, setPublishing] = useState(false);
  const [publishedMsg, setPublishedMsg] = useState(null);

  const handleMetadataChange = (field, value) => {
    setQuiz({ ...quiz, [field]: value });
  };

  const handleAxesChange = (axes) => {
    setQuiz({ ...quiz, axes });
  };

  const handleQuestionsChange = (questions) => {
    setQuiz({ ...quiz, questions });
  };

  const handleIdeologiesChange = (ideologies) => {
    setQuiz({ ...quiz, ideologies });
  };

  const handlePublishClick = async () => {
    setPublishing(true);
    setPublishedMsg(null);
    try {
      const res = await onPublish(quiz);
      if (res && res.success) {
        setPublishedMsg(`Quiz published! Share URL: ${window.location.origin}/#quiz=${res.id}`);
      }
    } catch (err) {
      console.error(err);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1>Creator</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Design your multi-axis quiz, customize colors, add questions, and publish.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={onSaveFile}>
            <Download size={16} /> Save .8val File
          </button>
          
          <button className="btn btn-primary btn-sm" onClick={handlePublishClick} disabled={publishing}>
            <Globe size={16} /> {publishing ? 'Publishing...' : 'Publish to Platform'}
          </button>

          <button className="btn btn-secondary btn-sm" onClick={() => {
            setIsThemeEditMode(true);
            onPlayQuiz();
          }}>
            <Palette size={16} /> Edit Theme Colors
          </button>

          <button className="btn btn-success btn-sm" onClick={onPlayQuiz}>
            <Play size={16} /> Test Run Quiz
          </button>
        </div>
      </div>

      {publishedMsg && (
        <div style={{ background: 'rgba(22, 163, 74, 0.15)', border: '1px solid #16a34a', color: '#4caf50', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={18} />
          <span>{publishedMsg}</span>
        </div>
      )}

      {/* General Settings Card */}
      <div className="axis-card" style={{ textAlign: 'left', marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>General Quiz Settings</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Quiz Title</label>
            <input
              type="text"
              className="form-input"
              value={quiz.title || ''}
              onChange={(e) => handleMetadataChange('title', e.target.value)}
              placeholder="e.g. 8values Political Spectrum"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Author Name</label>
            <input
              type="text"
              className="form-input"
              value={quiz.author || ''}
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
            value={quiz.description || ''}
            onChange={(e) => handleMetadataChange('description', e.target.value)}
            placeholder="Brief explanation of what this quiz measures..."
          />
        </div>
      </div>

      {/* Branding & Assets Card */}
      <div className="axis-card" style={{ textAlign: 'left', marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImageIcon size={20} style={{ color: '#a78bfa' }} />
          Branding & Assets
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {/* Thumbnail Upload */}
          <div>
            <label className="form-label">Quiz Thumbnail (Cover Image)</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Displayed on the search page. (Recommended ratio 16:9)
            </p>
            
            {quiz.thumbnail ? (
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <img src={quiz.thumbnail} alt="Thumbnail preview" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', objectFit: 'cover', aspectRatio: '16/9' }} />
                <button 
                  className="btn btn-danger btn-sm" 
                  style={{ position: 'absolute', top: '8px', right: '8px', padding: '0.25rem 0.5rem' }}
                  onClick={() => handleMetadataChange('thumbnail', null)}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '8px', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                <ImageIcon size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*" 
              className="form-input" 
              onChange={(e) => handleImageUpload(e, 'thumbnail', 600)} 
            />
          </div>

          {/* Favicon Upload */}
          <div>
            <label className="form-label">Favicon (Small Icon)</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Displayed in the browser tab and small badges. (Square)
            </p>

            {quiz.favicon ? (
              <div style={{ position: 'relative', marginBottom: '1rem', width: '64px' }}>
                <img src={quiz.favicon} alt="Favicon preview" style={{ width: '64px', height: '64px', borderRadius: '8px', border: '1px solid var(--border-color)', objectFit: 'cover' }} />
                <button 
                  className="btn btn-danger btn-sm" 
                  style={{ position: 'absolute', top: '-8px', right: '-8px', padding: '0.25rem', borderRadius: '50%' }}
                  onClick={() => handleMetadataChange('favicon', null)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '8px', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                <ImageIcon size={20} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              </div>
            )}

            <input 
              type="file" 
              accept="image/*" 
              className="form-input" 
              onChange={(e) => handleImageUpload(e, 'favicon', 128)} 
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="studio-tabs">
        <button
          className={`studio-tab ${activeTab === 'axes' ? 'active' : ''}`}
          onClick={() => setActiveTab('axes')}
        >
          1. Axes & Spectrums ({quiz.axes?.length || 0})
        </button>

        <button
          className={`studio-tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          2. Questions & Impacts ({quiz.questions?.length || 0})
        </button>

        <button
          className={`studio-tab ${activeTab === 'ideologies' ? 'active' : ''}`}
          onClick={() => setActiveTab('ideologies')}
        >
          3. Ideology Match Rules ({quiz.ideologies?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'axes' && (
        <AxisEditor axes={quiz.axes || []} setAxes={handleAxesChange} />
      )}

      {activeTab === 'questions' && (
        <QuestionEditor questions={quiz.questions || []} setQuestions={handleQuestionsChange} axes={quiz.axes || []} />
      )}

      {activeTab === 'ideologies' && (
        <IdeologyEditor ideologies={quiz.ideologies || []} setIdeologies={handleIdeologiesChange} axes={quiz.axes || []} />
      )}
    </div>
  );
}

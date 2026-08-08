import React, { useState, useEffect } from 'react';
import { User, Edit3, Check, Image as ImageIcon, Play, GitFork, ExternalLink, Link as LinkIcon, Save, X } from 'lucide-react';
import { DEFAULT_8VALUES_TEST } from '../utils/default8values';
import { TestCard } from './TestCard';
import { ConfirmModal } from './ConfirmModal';
import { ImageCropperModal } from './Studio/ImageCropperModal';

export function ProfilePage({ username, user, authToken, onSelectTest, onEditTest, onGoBack }) {
  const [profile, setProfile] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recycleBinTests, setRecycleBinTests] = useState([]);
  const [activeTab, setActiveTab] = useState('published');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, testId: null, isHard: false });
  const [cropModalState, setCropModalState] = useState({ isOpen: false, imageSrc: null });
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editSocial, setEditSocial] = useState('');
  const [editPic, setEditPic] = useState('');
  const [saving, setSaving] = useState(false);
  
  const isOwner = user && user.username.toLowerCase() === username.toLowerCase();

  const publishedTests = tests.filter(q => q.isDraft !== 1);
  const draftTests = tests.filter(q => q.isDraft === 1);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${username}`, {
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`
        } : {}
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setTests(data.tests);
        setEditBio(data.profile.bio || '');
        setEditSocial(data.profile.socialMedia || '');
        setEditPic(data.profile.profilePicture || '');
        
        if (isOwner && authToken) {
          try {
            const rbRes = await fetch(`/api/profile/${username}/recycle-bin`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const rbData = await rbRes.json();
            if (rbData.success) {
              setRecycleBinTests(rbData.tests);
            }
          } catch(e) {}
        }
      } else {
        alert(data.error || 'Profile not found');
      }
    } catch (err) {
      alert('Network error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    const { testId, isHard } = deleteModal;
    setDeleteModal({ isOpen: false, testId: null, isHard: false });
    if (!testId) return;
    
    try {
      const endpoint = isHard ? `/api/tests/${testId}/permanent` : `/api/tests/${testId}`;
      const res = await fetch(`${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        loadProfile(); // Refresh list
      } else {
        alert(data.error || 'Failed to delete test');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while deleting test');
    }
  };

  const handleRestoreTest = async (testId) => {
    try {
      const res = await fetch(`/api/tests/${testId}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        loadProfile(); // Refresh list
      } else {
        alert(data.error || 'Failed to restore test');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while restoring test');
    }
  };

  useEffect(() => {
    loadProfile();
  }, [username]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (file.type === 'image/gif') {
        setEditPic(event.target.result);
        return;
      }
      setCropModalState({ isOpen: true, imageSrc: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ bio: editBio, socialMedia: editSocial, profilePicture: editPic })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        await loadProfile();
      } else {
        alert(data.error || 'Failed to save profile');
      }
    } catch (err) {
      alert('Network error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2>User not found</h2>
        <button className="btn btn-primary" onClick={onGoBack} style={{ marginTop: '1rem' }}>Return to Explore</button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '100%', margin: '0 auto', paddingBottom: '4rem' }}>
      <ImageCropperModal
        isOpen={cropModalState.isOpen}
        imageSrc={cropModalState.imageSrc}
        aspectRatio={1}
        title="Crop Profile Picture (1:1)"
        onComplete={(croppedImg) => {
          setEditPic(croppedImg);
          setCropModalState({ isOpen: false, imageSrc: null });
        }}
        onCancel={() => setCropModalState({ isOpen: false, imageSrc: null })}
      />
      
      {/* Profile Header */}
      <div className="axis-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center', backgroundColor: 'var(--container-bg)', borderRadius: '12px', padding: '2rem' }}>
        
        {isEditing ? (
          <div className="avatar-container">
            <label style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              
              <img src={editPic || `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(profile.username)}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              
              <div className="avatar-overlay">
                <ImageIcon size={28} style={{ marginBottom: '0.25rem' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Change Picture</span>
              </div>
            </label>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <img src={profile.profilePicture || `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(profile.username)}`} alt="Avatar" style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-primary)' }} />
          </div>
        )}

        <div style={{ width: '100%', maxWidth: '500px' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', lineHeight: 1.2 }}>{profile.username}</h2>
          
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Bio</label>
                <textarea 
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)} 
                  style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '6px', border: '2px solid #cccccc', background: 'var(--bg-primary)', color: 'var(--text-main)', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Social Media Link</label>
                  <input 
                    type="text" 
                    value={editSocial} 
                    onChange={e => setEditSocial(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '2px solid #cccccc', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              {profile.bio && (
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {profile.bio}
                </p>
              )}
              {profile.socialMedia && (
                <a href={profile.socialMedia.startsWith('http') ? profile.socialMedia : `https://${profile.socialMedia}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', textDecoration: 'none', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '500' }}>
                  <ExternalLink size={14} />
                  {profile.socialMedia.replace(/^https?:\/\//, '')}
                </a>
              )}
              {isOwner && (
                <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)} style={{ marginTop: '0.5rem' }}>
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ margin: '3rem 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Tests by {profile.username}</h2>
        {isOwner && (
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button 
              className={`btn btn-sm ${activeTab === 'published' ? 'btn-primary' : ''}`} 
              style={{ background: activeTab === 'published' ? '' : 'transparent', color: activeTab === 'published' ? '' : 'var(--text-muted)' }}
              onClick={() => setActiveTab('published')}
            >
              Published ({publishedTests.length})
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'drafts' ? 'btn-primary' : ''}`} 
              style={{ background: activeTab === 'drafts' ? '' : 'transparent', color: activeTab === 'drafts' ? '' : 'var(--text-muted)' }}
              onClick={() => setActiveTab('drafts')}
            >
              Drafts ({draftTests.length})
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'recycle' ? 'btn-primary' : ''}`} 
              style={{ background: activeTab === 'recycle' ? '' : 'transparent', color: activeTab === 'recycle' ? '' : 'var(--text-muted)' }}
              onClick={() => setActiveTab('recycle')}
            >
              Recycle Bin ({recycleBinTests.length})
            </button>
          </div>
        )}
      </div>
      
      {activeTab === 'published' && (
        publishedTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--container-bg)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            This user hasn't published any tests yet.
          </div>
        ) : (
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {publishedTests.map((test) => (
                <TestCard 
                  key={test.id} 
                  test={test} 
                  isOwner={isOwner} 
                  onSelectTest={onSelectTest} 
                  onEditTest={onEditTest} 
                  onDeleteTest={isOwner ? () => setDeleteModal({ isOpen: true, testId: test.id, isHard: false }) : null}
                />
              ))}
            </div>
          </div>
        )
      )}

      {isOwner && activeTab === 'drafts' && (
        draftTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--container-bg)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            No drafts found.
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {draftTests.map((test) => (
                <TestCard 
                  key={test.id} 
                  test={test} 
                  isOwner={isOwner} 
                  onSelectTest={onSelectTest} 
                  onEditTest={onEditTest} 
                  onDeleteTest={isOwner ? () => setDeleteModal({ isOpen: true, testId: test.id, isHard: false }) : null}
                />
              ))}
            </div>
          </div>
        )
      )}

      {isOwner && activeTab === 'recycle' && (
        recycleBinTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--container-bg)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            Recycle Bin is empty.
          </div>
        ) : (
          <div>
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
              Items in the Recycle Bin will be automatically deleted after 30 days.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {recycleBinTests.map((test) => (
                <div key={test.id} style={{ position: 'relative' }}>
                  <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
                    <TestCard test={test} isOwner={false} />
                  </div>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', zIndex: 10 }}>
                    <button className="btn btn-primary" onClick={() => handleRestoreTest(test.id)}>Restore</button>
                    <button className="btn btn-delete" onClick={() => setDeleteModal({ isOpen: true, testId: test.id, isHard: true })}>Permanently Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.isHard ? "Permanently Delete Test?" : "Move to Recycle Bin?"}
        message={deleteModal.isHard ? "Are you sure you want to permanently delete this test? This action cannot be undone." : "Are you sure you want to move this test to the Recycle Bin? It will be automatically deleted in 30 days."}
        confirmText={deleteModal.isHard ? "Permanently Delete" : "Move to Recycle Bin"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, testId: null, isHard: false })}
      />
    </div>
  );
}

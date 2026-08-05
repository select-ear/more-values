import React, { useState, useEffect } from 'react';
import { User, Edit3, Check, Image as ImageIcon, Play, GitFork, ExternalLink, Link as LinkIcon, Save, X } from 'lucide-react';
import { DEFAULT_8VALUES_TEST } from '../utils/default8values';
import { TestCard } from './TestCard';

export function ProfilePage({ username, user, authToken, onSelectTest, onEditTest, onGoBack }) {
  const [profile, setProfile] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      const res = await fetch(`http://localhost:4000/api/profile/${username}`, {
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
      } else {
        alert(data.error || 'Profile not found');
      }
    } catch (err) {
      alert('Network error loading profile');
    } finally {
      setLoading(false);
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
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_SIZE) {
          height = Math.round(height * MAX_SIZE / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round(width * MAX_SIZE / height);
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setEditPic(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('http://localhost:4000/api/profile', {
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
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Profile Header */}
      <div className="axis-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center', backgroundColor: 'var(--container-bg)', borderRadius: '12px', padding: '2rem' }}>
        
        {isEditing ? (
          <div className="avatar-container">
            <label style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              
              {editPic ? (
                 <img src={editPic} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                 <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <User size={64} color="var(--text-muted)" />
                 </div>
              )}
              
              <div className="avatar-overlay">
                <ImageIcon size={28} style={{ marginBottom: '0.25rem' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Change Picture</span>
              </div>
            </label>
          </div>
        ) : (
          <div>
            {profile.profilePicture ? (
               <img src={profile.profilePicture} alt="Avatar" style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-primary)' }} />
            ) : (
               <div style={{ width: '160px', height: '160px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid var(--bg-primary)' }}>
                 <User size={64} color="var(--text-muted)" />
               </div>
            )}
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
                  placeholder="Tell us about yourself..."
                  style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Social Media Link</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <LinkIcon size={18} color="var(--text-muted)" />
                  <input 
                    type="text" 
                    value={editSocial} 
                    onChange={e => setEditSocial(e.target.value)} 
                    placeholder="https://x.com/username"
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
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

      <div style={{ margin: '3rem 0 1.5rem 0' }}>
        <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Tests by {profile.username}</h2>
      </div>
      
      {publishedTests.length === 0 && draftTests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--container-bg)', borderRadius: '12px', color: 'var(--text-muted)' }}>
          This user hasn't published any tests yet.
        </div>
      ) : (
        <>
          {publishedTests.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {publishedTests.map((test) => (
                  <TestCard 
                    key={test.id} 
                    test={test} 
                    isOwner={isOwner} 
                    onSelectTest={onSelectTest} 
                    onEditTest={onEditTest} 
                  />
                ))}
              </div>
            </div>
          )}

          {isOwner && draftTests.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem 0', color: 'var(--text-main)' }}>Your Drafts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {draftTests.map((test) => (
                  <TestCard 
                    key={test.id} 
                    test={test} 
                    isOwner={isOwner} 
                    onSelectTest={onSelectTest} 
                    onEditTest={onEditTest} 
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

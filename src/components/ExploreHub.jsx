import React, { useState, useEffect } from 'react';
import { Search, Play, GitFork, Edit3, Trash2, Download, Sparkles, Globe, User } from 'lucide-react';
import { DEFAULT_8VALUES_TEST } from '../utils/default8values';
import { TestCard } from './TestCard';

export function ExploreHub({ onSelectTest, onEditTest, user, authToken, onViewProfile }) {
  const [tests, setTests] = useState([DEFAULT_8VALUES_TEST]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt to load community published tests from backend API
    const fetchTests = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:4000/api/tests');
        const data = await res.json();
        if (data.success && Array.isArray(data.tests)) {
          // Merge API tests with default 8values
          const merged = [
            DEFAULT_8VALUES_TEST,
            ...data.tests.filter(q => q.id !== '8values-classic')
          ];
          setTests(merged);
        }
      } catch (err) {
        // Backend server offline, fallback to preset tests
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test? This cannot be undone.')) return;
    try {
      const res = await fetch(`http://localhost:4000/api/tests/${testId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setTests(prev => prev.filter(q => q.id !== testId));
      } else {
        alert(data.error || 'Failed to delete test');
      }
    } catch (err) {
      alert('Could not connect to server.');
    }
  };

  const filteredTests = tests.filter(q =>
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
            placeholder="Search tests by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Tests */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {filteredTests.map((test) => (
          <TestCard 
            key={test.id} 
            test={test} 
            isOwner={user && test.ownerId === user.id} 
            onSelectTest={onSelectTest} 
            onEditTest={onEditTest} 
            onViewProfile={onViewProfile} 
            onDeleteTest={(user && test.ownerId === user.id && test.id !== '8values-classic') ? handleDeleteTest : null}
          />
        ))}
      </div>
    </div>
  );
}

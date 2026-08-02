import React from 'react';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

export function QuestionEditor({ questions, setQuestions, axes }) {
  const handleAddQuestion = () => {
    const defaultEffects = {};
    if (axes.length > 0) {
      defaultEffects[axes[0].id] = 10;
    }

    const newQuestion = {
      id: Date.now(),
      text: "New statement to be rated by users.",
      effects: defaultEffects
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleUpdateText = (index, text) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], text };
    setQuestions(updated);
  };

  const handleUpdateEffect = (qIdx, axisId, weightVal) => {
    const updated = [...questions];
    const effects = { ...(updated[qIdx].effects || {}) };

    if (weightVal === 0) {
      delete effects[axisId];
    } else {
      effects[axisId] = weightVal;
    }

    updated[qIdx] = { ...updated[qIdx], effects };
    setQuestions(updated);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3>Statements & Questions ({questions.length})</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Add statements and define which direction they push the user on each axis when they agree.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleAddQuestion}>
          <Plus size={16} />
          Add Question
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {questions.map((q, qIdx) => (
          <div key={q.id || qIdx} className="axis-card" style={{ textAlign: 'left', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>Question #{qIdx + 1}</span>
              <button className="btn btn-danger btn-sm" onClick={() => handleRemoveQuestion(qIdx)}>
                <Trash2 size={14} /> Remove
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Statement Text</label>
              <textarea
                className="form-textarea"
                value={q.text}
                onChange={(e) => handleUpdateText(qIdx, e.target.value)}
                placeholder="Enter statement..."
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '22pt',
                  textAlign: 'center',
                  backgroundColor: 'var(--container-bg, #eeeeee)',
                  color: 'var(--heading-color, #333333)',
                  borderRadius: '16px',
                  padding: '24px',
                  minHeight: '140px',
                  fontWeight: 400,
                  resize: 'vertical',
                  lineHeight: '1.3'
                }}
              />
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <label className="form-label" style={{ marginBottom: '0.75rem' }}>
                Axis Weights & Impacts (When Agreeing)
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {axes.map((axis) => {
                  const currentWeight = q.effects?.[axis.id] ?? 0;
                  return (
                    <div
                      key={axis.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                        <span style={{ color: axis.left.color }}>{axis.left.name} (+{currentWeight > 0 ? currentWeight : 0})</span>
                        <span style={{ color: axis.right.color }}>{axis.right.name} ({currentWeight < 0 ? Math.abs(currentWeight) : 0}+)</span>
                      </div>

                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="5"
                        value={-currentWeight}
                        onChange={(e) => handleUpdateEffect(qIdx, axis.id, -parseInt(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />

                      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {currentWeight === 0 ? 'No impact on this axis' : `Pushes towards ${currentWeight > 0 ? axis.left.name : axis.right.name}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

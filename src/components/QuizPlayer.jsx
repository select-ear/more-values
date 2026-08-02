import React, { useState, useEffect } from 'react';
import { calculateQuizResults } from '../utils/quizEngine';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { ValueIcon } from './ValueIcon';

function InnerQuizPlayer({ quiz, onComplete, onEditInStudio }) {
  // view state: 'home' | 'instructions' | 'playing'
  const [viewState, setViewState] = useState('home');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>No questions found in this quiz!</h2>
        <p style={{ margin: '1rem 0' }}>
          Open the Creator to add questions to your test.
        </p>
        <button className="menu-btn" onClick={onEditInStudio}>
          Open Creator
        </button>
      </div>
    );
  }

  // 1. Home Screen - 100% 8values index.html structure
  if (viewState === 'home') {
    return (
      <div>
        {/* Octocat GitHub Corner SVG */}
        <a href="https://github.com/8values/8values.github.io" className="github-corner" aria-label="View source on Github">
          <svg width="80" height="80" viewBox="0 0 250 250" style={{ fill: '#151513', color: '#fff', position: 'absolute', top: 0, border: 0, right: 0 }} aria-hidden="true">
            <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
            <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style={{ transformOrigin: '130px 106px' }} className="octo-arm"></path>
            <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" className="octo-body"></path>
          </svg>
        </a>

        <h1>{quiz.title}</h1>
        <hr />

        <div className="center">
          <div className="quadcolumn-headers">
            {quiz.axes.map((axis) => (
              <div key={axis.id} className="axis_name quadcolumn">
                {axis.name}
              </div>
            ))}
          </div>

          <div className="quadcolumn-row">
            {quiz.axes.map((axis) => (
              <a href="#anchor" key={`${axis.id}-left`} className="quadcolumn clickable">
                <ValueIcon
                  name={axis.left.name}
                  color={axis.left.color}
                  iconSrc={axis.left.icon || '/raw_icons/equality.svg'}
                  style={{ width: '100%', height: '100%' }}
                />
              </a>
            ))}
          </div>

          <div className="quadcolumn-row">
            {quiz.axes.map((axis) => (
              <a href="#anchor" key={`${axis.id}-right`} className="quadcolumn clickable">
                <ValueIcon
                  name={axis.right.name}
                  color={axis.right.color}
                  iconSrc={axis.right.icon || '/raw_icons/markets.svg'}
                  style={{ width: '100%', height: '100%' }}
                />
              </a>
            ))}
          </div>
        </div>
        <br />

        <button className="button" style={{ fontSize: '36pt' }} onClick={() => setViewState('instructions')}>
          Click here to start!
        </button>
        <br />

        <hr />

        <h2>What is {quiz.title}?</h2>
        <p>
          {quiz.description} You will be presented with a statement, and then you will answer with your opinion on the statement, from <b>Strongly Agree</b> to <b>Strongly Disagree</b>, with each answer slightly affecting your scores. At the end of the quiz, your answers will be compared to the maximum possible for each value. Answer honestly!<br /><br />
          There are <b><u><span>{quiz.questions.length}</span></u></b> questions in the test.
        </p>

        <h2><a id="anchor" style={{ color: 'inherit', textDecoration: 'none' }}>What are the values?</a></h2>
        <p>There are independent axes, and each has two opposing values assigned to them:</p>

        <div className="explanation_bg">
          {quiz.axes.map((axis) => (
            <div key={axis.id} className="spacer">
              <div className="explanation_blurb_left">
                <p className="value"><b style={{ color: axis.left.color }}>{axis.left.name.toUpperCase()}</b></p>
                <p className="blurb-text">
                  High {axis.left.name} scores indicate alignment towards the {axis.left.name} value spectrum.
                </p>
              </div>

              <div className="explanation_axis">
                <p className="axis_name">{axis.name}</p>
                <img className="arrow" src="/double_arrow.svg" alt="Double Arrow" />
              </div>

              <div className="explanation_blurb_right">
                <p className="value"><b style={{ color: axis.right.color }}>{axis.right.name.toUpperCase()}</b></p>
                <p className="blurb-text">
                  High {axis.right.name} scores indicate alignment towards the {axis.right.name} value spectrum.
                </p>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: '17pt' }}>What's the "Closest Match" mean at the bottom of the results?</h2>
        <p>
          In addition to matching you to the values, the quiz also attempts to match you to a political or philosophical ideology. This is a work in progress, so don't take it too seriously.
        </p>

        <h2>I don't like my scores!</h2>
        <p>
          ¯\_(ツ)_/¯<br />
          If you have any suggestions or constructive criticism, feel free to edit or fork this test in the Creator!
        </p>
      </div>
    );
  }

  // 2. Instructions Screen - 100% 8values instructions.html structure
  if (viewState === 'instructions') {
    return (
      <div>
        <h1>{quiz.title}</h1>
        <hr />
        <h2 style={{ textAlign: 'center' }}>Instructions</h2>
        <p className="question">
          You will be presented with a series of statements. For each one, click the button with your opinion on it.
        </p>
        <button className="button" onClick={() => setViewState('playing')}>
          Got it!
        </button> <br />
        <button className="button disagree" onClick={() => setViewState('home')}>
          Wait, nevermind!
        </button> <br />
      </div>
    );
  }

  // 3. Quiz Player Screen - 100% 8values quiz.html structure
  const currentQuestion = quiz.questions[currentIdx];
  const totalQuestions = quiz.questions.length;

  const handleAnswer = (multiplier) => {
    const updatedAnswers = { ...answers, [currentQuestion.id]: multiplier };
    setAnswers(updatedAnswers);

    if (currentIdx + 1 < totalQuestions) {
      setCurrentIdx(currentIdx + 1);
    } else {
      const results = calculateQuizResults(quiz, updatedAnswers);
      onComplete(results);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    } else {
      setViewState('instructions');
    }
  };

  return (
    <div>
      <h1>{quiz.title}</h1>
      <hr />
      <h2 style={{ textAlign: 'center' }}>
        Question {currentIdx + 1} of {totalQuestions}
      </h2>

      <p className="question">
        {currentQuestion.text}
      </p>

      <div style={{ textAlign: 'center' }}>
        <button className="button stronglyAgree" onClick={() => handleAnswer(1.0)}>Strongly Agree</button> <br />
        <button className="button agree" onClick={() => handleAnswer(0.5)}>Agree</button> <br />
        <button className="button neutral" onClick={() => handleAnswer(0.0)}>Neutral/Unsure</button> <br />
        <button className="button disagree" onClick={() => handleAnswer(-0.5)}>Disagree</button> <br />
        <button className="button stronglyDisagree" onClick={() => handleAnswer(-1.0)}>Strongly Disagree</button> <br />

        <div style={{ marginTop: '1rem' }}>
          <button className="small_button" onClick={handlePrev}>Back</button>
          <button className="small_button" onClick={() => setViewState('home')}>Quit</button>
        </div>
      </div>
    </div>
  );
}

export function QuizPlayer(props) {
  const { isThemeEditMode, onUpdateTheme, quiz } = props;
  const [activePicker, setActivePicker] = useState(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isThemeEditMode) {
      setActivePicker(null);
      return;
    }

    const handleGlobalClick = (e) => {
      // Ignore clicks inside the color picker itself
      if (e.target.closest('.color-picker-popover')) {
        return;
      }

      const el = e.target;
      let targetKey = null;

      if (el.tagName === 'HTML') targetKey = 'htmlBg';
      else if (el.tagName === 'BODY') targetKey = 'border';
      else if (el.tagName === 'HR') targetKey = 'lines';
      else if (el.closest('h1, h2, .question, .axis_name')) targetKey = 'headings';
      else if (el.closest('p')) targetKey = 'text';
      else if (el.closest('.center')) targetKey = 'centerBg';
      else if (el.closest('.explanation_bg, .quadcolumn-headers, .quadcolumn-row, .top-nav')) targetKey = 'containerBg';
      else targetKey = 'background'; // Fallback to background

      setActivePicker(targetKey);
      setPickerPos({ x: e.clientX, y: e.clientY });
      e.stopPropagation();
      e.preventDefault();
    };

    window.addEventListener('pointerdown', handleGlobalClick, { capture: true });
    
    // Set crosshair cursor on the whole document
    document.documentElement.style.cursor = 'crosshair';
    document.body.style.cursor = 'crosshair';

    return () => {
      window.removeEventListener('pointerdown', handleGlobalClick, { capture: true });
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
    };
  }, [isThemeEditMode]);

  return (
    <div className={isThemeEditMode ? 'theme-edit-mode' : ''}>
      {/* Theme edit mode banner removed as requested */}
      
      {isThemeEditMode && activePicker && (
        <div 
          className="color-picker-popover" 
          style={{ 
            position: 'fixed', 
            top: pickerPos.y + 10, 
            left: pickerPos.x + 10, 
            zIndex: 9999, 
            background: 'white', 
            padding: '12px', 
            borderRadius: '8px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            border: '1px solid #ccc'
          }}
        >
          <select 
            value={activePicker} 
            onChange={(e) => setActivePicker(e.target.value)}
            style={{ marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '0.9rem', width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="htmlBg">Outer Page Background</option>
            <option value="border">Page Border (Vertical Lines)</option>
            <option value="background">Inner Background</option>
            <option value="centerBg">Center Area Box</option>
            <option value="containerBg">Other Container Boxes</option>
            <option value="headings">Headings & Titles</option>
            <option value="text">Paragraph Text</option>
            <option value="lines">Horizontal Lines</option>
            <option value="resultsBarBg">Results Bar Background</option>
            <option value="resultsBarBorder">Results Bar Border</option>
          </select>
          <HexColorPicker 
            color={quiz.theme?.[activePicker] || '#cccccc'} 
            onChange={(color) => onUpdateTheme?.(activePicker, color)} 
          />
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>HEX:</span>
            <HexColorInput 
              color={quiz.theme?.[activePicker] || '#cccccc'} 
              onChange={(color) => onUpdateTheme?.(activePicker, color)} 
              prefixed
              style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      )}

      <InnerQuizPlayer {...props} />
    </div>
  );
}

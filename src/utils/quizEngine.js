/**
 * Calculates quiz results based on user answers and quiz definition.
 * 
 * Answers map: { [questionId]: 1.0 | 0.5 | 0 | -0.5 | -1.0 }
 */
export function calculateQuizResults(quiz, userAnswers) {
  const scores = {};
  const maxScores = {};

  // Initialize scores for all axes defined in the quiz
  quiz.axes.forEach(axis => {
    scores[axis.id] = 0;
    maxScores[axis.id] = 0;
  });

  // Accumulate scores and potential max scores
  quiz.questions.forEach(question => {
    const answerVal = userAnswers[question.id] ?? 0;
    if (question.effects) {
      Object.entries(question.effects).forEach(([axisId, weight]) => {
        if (scores[axisId] !== undefined) {
          scores[axisId] += answerVal * weight;
          maxScores[axisId] += Math.abs(weight);
        }
      });
    }
  });

  // Calculate percentage breakdown for each axis (Left % vs Right %)
  const axisResults = quiz.axes.map(axis => {
    const max = maxScores[axis.id] || 1;
    const raw = scores[axis.id];

    // Normalize -1 to +1 range onto 0% to 100% Left percentage
    let leftPct = Math.round(50 + (raw / max) * 50);
    leftPct = Math.max(0, Math.min(100, leftPct));
    const rightPct = 100 - leftPct;

    return {
      axisId: axis.id,
      axisName: axis.name,
      left: {
        ...axis.left,
        percentage: leftPct
      },
      right: {
        ...axis.right,
        percentage: rightPct
      }
    };
  });

  // Determine matched ideology
  const matchedIdeology = findMatchedIdeology(quiz.ideologies || [], axisResults);

  return {
    axisResults,
    matchedIdeology,
    completedAt: new Date().toISOString()
  };
}

/**
 * Finds the closest matching ideology based on axis percentage criteria
 */
function findMatchedIdeology(ideologies, axisResults) {
  if (!ideologies || ideologies.length === 0) {
    return { name: "Custom Classification", description: "Your results across defined axes." };
  }

  let bestMatch = null;
  let highestScore = -Infinity;

  const resultsMap = {};
  axisResults.forEach(r => {
    resultsMap[r.axisId] = r.left.percentage;
  });

  ideologies.forEach(ideology => {
    if (!ideology.criteria || Object.keys(ideology.criteria).length === 0) {
      if (!bestMatch) bestMatch = ideology;
      return;
    }

    let matchScore = 0;
    let totalCriteria = 0;

    Object.entries(ideology.criteria).forEach(([axisId, [min, max]]) => {
      totalCriteria++;
      const val = resultsMap[axisId];
      if (val !== undefined) {
        if (val >= min && val <= max) {
          // Inside target range
          matchScore += 100 - Math.abs(val - (min + max) / 2);
        } else {
          // Penalty for distance outside target range
          const distance = val < min ? min - val : val - max;
          matchScore -= distance * 2;
        }
      }
    });

    if (totalCriteria > 0) {
      const avgScore = matchScore / totalCriteria;
      if (avgScore > highestScore) {
        highestScore = avgScore;
        bestMatch = ideology;
      }
    }
  });

  return bestMatch || { name: "Unique Spectrum", description: "Balanced mix across axes." };
}

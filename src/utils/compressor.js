import LZString from 'lz-string';

/**
 * Encodes a quiz object into a compressed URL hash payload.
 */
export function encodeQuizToUrlHash(quiz) {
  try {
    const jsonStr = JSON.stringify(quiz);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (err) {
    console.error("Error compressing quiz to hash:", err);
    return null;
  }
}

/**
 * Decodes a quiz object from a compressed URL hash payload.
 */
export function decodeQuizFromUrlHash(hashString) {
  try {
    if (!hashString) return null;
    const cleanHash = hashString.startsWith('#') ? hashString.substring(1) : hashString;
    const param = new URLSearchParams(cleanHash).get('quiz') || cleanHash;
    const decompressed = LZString.decompressFromEncodedURIComponent(param);
    if (!decompressed) return null;
    return JSON.parse(decompressed);
  } catch (err) {
    console.error("Error decompressing quiz from hash:", err);
    return null;
  }
}

/**
 * Downloads a quiz object as a local `.8val.json` file.
 */
export function downloadQuizJson(quiz, filename = `${quiz.id || 'custom-quiz'}.8val.json`) {
  const jsonString = JSON.stringify(quiz, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

/**
 * Reads a uploaded JSON file into a JavaScript Quiz object.
 */
export function parseQuizJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.title || !Array.isArray(parsed.axes) || !Array.isArray(parsed.questions)) {
          throw new Error("Invalid .8val.json format: Missing title, axes, or questions array.");
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

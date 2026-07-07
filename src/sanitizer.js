/**
 * Sanitizer utilities for XSS prevention and safe text formatting.
 */

/**
 * Escapes HTML special characters to prevent HTML injection / XSS.
 * @param {string} str - Raw input string
 * @returns {string} Safe escaped string
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips dangerous HTML tags while allowing basic formatting like bold and lists.
 * This is useful for rendering markdown-like responses from GenAI safely.
 * @param {string} str - Markdown or HTML string from AI model
 * @returns {string} Sanitized HTML string
 */
export function sanitizeAIResponse(str) {
  if (typeof str !== 'string') return '';
  
  let lines = str.split('\n');
  let inList = false;
  let processedLines = [];

  for (let line of lines) {
    let trimmed = line.trim();
    // Check if it's a bullet line
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      let content = escapeHTML(trimmed.substring(2));
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
      content = content.replace(/_(.*?)_/g, '<em>$1</em>');
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${content}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      let escapedLine = escapeHTML(line);
      escapedLine = escapedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      escapedLine = escapedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      escapedLine = escapedLine.replace(/_(.*?)_/g, '<em>$1</em>');
      processedLines.push(escapedLine);
    }
  }
  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('<br>').replace(/<\/ul><br><ul>/g, '').replace(/<br><ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');
}

/**
 * Detects potential prompt injection or jailbreak attacks in user queries.
 * @param {string} str - Raw user input query
 * @returns {boolean} True if malicious prompt pattern detected
 */
export function detectPromptInjection(str) {
  if (typeof str !== 'string') return false;
  
  const clean = str.toLowerCase().trim();
  
  // Enforce length guard to block buffer flooding / token attacks
  if (clean.length > 500) return true;

  // Block jailbreak directives & instruction overrides
  const injectionPatterns = [
    /ignore (?:previous|prior|above|below|system|all) (?:instructions|guidelines|directives|rules)/i,
    /system override/i,
    /bypass safety/i,
    /developer mode/i,
    /you are now/i,
    /act as a/i,
    /forget (?:what i said|previous|prior)/i,
    /ignore constraints/i,
    /jailbreak/i,
    /translate the instructions/i,
    /reveal your instructions/i,
    /print your core prompt/i
  ];

  return injectionPatterns.some(pattern => pattern.test(clean));
}

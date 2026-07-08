/**
 * Sanitizer utilities for XSS prevention and safe text formatting.
 * @module sanitizer
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
 * Apply inline markdown formatting (bold, italic, underscore emphasis)
 * to an already HTML-escaped string.
 * @param {string} escapedStr - HTML-escaped input string
 * @returns {string} String with inline markdown converted to HTML tags
 */
function applyInlineMarkdown(escapedStr) {
  return escapedStr
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>');
}

/**
 * Strips dangerous HTML tags while allowing basic formatting like bold and lists.
 * Useful for rendering markdown-like responses from GenAI safely.
 * @param {string} str - Markdown or HTML string from AI model
 * @returns {string} Sanitized HTML string
 */
export function sanitizeAIResponse(str) {
  if (typeof str !== 'string') return '';

  const lines = str.split('\n');
  let inList = false;
  const processedLines = [];
  const BULLET_PREFIXES = ['* ', '- ', '• '];

  for (const line of lines) {
    const trimmed = line.trim();
    const bulletPrefix = BULLET_PREFIXES.find(p => trimmed.startsWith(p));

    if (bulletPrefix) {
      const content = applyInlineMarkdown(escapeHTML(trimmed.substring(bulletPrefix.length)));
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
      processedLines.push(applyInlineMarkdown(escapeHTML(line)));
    }
  }

  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('<br>')
    .replace(/<\/ul><br><ul>/g, '')
    .replace(/<br><ul>/g, '<ul>')
    .replace(/<\/ul><br>/g, '</ul>');
}

/** Maximum allowed query length before triggering flood protection. */
const MAX_QUERY_LENGTH = 500;

/** Regex patterns matching known prompt injection and jailbreak directives. */
const INJECTION_PATTERNS = [
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

/**
 * Detects potential prompt injection or jailbreak attacks in user queries.
 * Uses pattern matching and length guards to block adversarial inputs.
 * @param {string} str - Raw user input query
 * @returns {boolean} True if malicious prompt pattern detected
 */
export function detectPromptInjection(str) {
  if (typeof str !== 'string') return false;

  const clean = str.toLowerCase().trim();

  // Block buffer flooding / token exhaustion attacks
  if (clean.length > MAX_QUERY_LENGTH) return true;

  return INJECTION_PATTERNS.some(pattern => pattern.test(clean));
}

/**
 * UI Chat and Speech Component for Smadiums.
 * Handles multilingual messaging display, Text-to-Speech (TTS), and Speech-to-Text (STT) integrations.
 * @module ui-chat
 */

import { sanitizeAIResponse, escapeHTML } from './sanitizer.js';
import { playTone } from './utils.js';

/**
 * Render the chat bubbles inside the Fan Concierge.
 * @param {Array<import('./state').ChatMessage>} chat - Message logs array from state
 * @param {HTMLElement | null} chatMessages - Container pane for messages
 * @returns {void}
 */
export function renderChat(chat, chatMessages) {
  if (!chat || !chatMessages) return;
  const scrollPos = chatMessages.scrollTop;
  const isAtBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 30;

  chatMessages.innerHTML = '';
  
  chat.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble sender-${msg.sender}`;
    
    // AI messages support formatted Markdown, User messages are pure sanitized text
    const textContent = msg.sender === 'ai' ? sanitizeAIResponse(msg.text) : escapeHTML(msg.text);
    
    bubble.innerHTML = `
      <div class="bubble-content">${textContent}</div>
      <div class="bubble-meta">
        <span>${msg.timestamp}</span>
        ${msg.sender === 'ai' ? `<button class="tts-btn" aria-label="Speak text" data-text="${escapeHTML(msg.text)}">🔊</button>` : ''}
      </div>
    `;

    const ttsBtn = bubble.querySelector('.tts-btn');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakTextTextToSpeech(ttsBtn.dataset.text);
      });
    }

    chatMessages.appendChild(bubble);
  });

  // Restore scroll or snap to bottom
  if (isAtBottom) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else {
    chatMessages.scrollTop = scrollPos;
  }
}

/**
 * TTS Helper. Speaks text out loud using Web Speech Synthesis API.
 * @param {string} text - Raw text to dictate
 * @returns {void}
 */
export function speakTextTextToSpeech(text) {
  if ('speechSynthesis' in window) {
    // Cancel active synthesis
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      return;
    }
    const cleanText = text.replace(/[*#_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Detect Spanish and French language patterns for correct dialect
    const lowerText = cleanText.toLowerCase();
    if (lowerText.includes('puerta') || lowerText.includes('hola') || lowerText.includes('baño')) {
      utterance.lang = 'es-ES';
    } else if (lowerText.includes('bonjour') || lowerText.includes('merci')) {
      utterance.lang = 'fr-FR';
    } else {
      utterance.lang = 'en-US';
    }

    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Audio synthesis not supported by browser.');
  }
}

/**
 * Voice dictation (Speech to Text simulation).
 * Uses Web Speech Recognition API if available; falls back to simulated injection.
 * @param {HTMLElement} speakInputBtn - Mic trigger button
 * @param {HTMLInputElement} chatInput - Chat input element
 * @param {HTMLFormElement} chatForm - Chat submission form
 * @param {string} selectedLanguage - Active language code
 * @param {Function} announceToScreenReader - A11y live announcer callback
 * @returns {void}
 */
export function handleVoiceInput(speakInputBtn, chatInput, chatForm, selectedLanguage, announceToScreenReader) {
  playTone(880, 0.05);
  const recognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  if (!recognition) {
    // Mock simulation if voice API is disabled
    chatInput.value = 'Where is the nearest wheelchair elevator?';
    chatInput.focus();
    announceToScreenReader('Voice recognition not supported. Simulated: Where is the nearest wheelchair elevator?');
    return;
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRec();
  rec.lang = selectedLanguage === 'es' ? 'es-ES' : 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  speakInputBtn.classList.add('recording');
  announceToScreenReader('Voice recording active. Please speak now.');

  rec.onresult = (event) => {
    const resultText = event.results[0][0].transcript;
    chatInput.value = resultText;
    speakInputBtn.classList.remove('recording');
    chatForm.requestSubmit();
  };

  rec.onerror = (e) => {
    console.error('Speech recognition error:', e);
    speakInputBtn.classList.remove('recording');
  };

  rec.onend = () => {
    speakInputBtn.classList.remove('recording');
  };

  rec.start();
}

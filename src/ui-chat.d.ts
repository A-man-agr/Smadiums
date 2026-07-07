/**
 * TypeScript Typings for Smadiums Chat and Voice feedback.
 */

import { ChatMessage } from './state';

export function renderChat(chat: ChatMessage[], chatMessages: HTMLElement | null): void;
export function speakTextTextToSpeech(text: string): void;
export function handleVoiceInput(
  speakInputBtn: HTMLElement | null,
  chatInput: HTMLInputElement | null,
  chatForm: HTMLFormElement | null,
  selectedLanguage: string,
  announceToScreenReader: (message: string) => void
): void;

/**
 * TypeScript Typings for Smadiums Chat and Speech Component.
 * @module ui-chat
 */

import { ChatMessage } from './state';

export function renderChat(chat: ChatMessage[], chatMessages: HTMLElement | null): void;
export function speakText(text: string): void;
export function handleVoiceInput(
  speakInputBtn: HTMLElement,
  chatInput: HTMLInputElement,
  chatForm: HTMLFormElement,
  selectedLanguage: string,
  announceToScreenReader: (message: string) => void
): void;
export function handleChatSubmit(
  e: Event,
  chatInput: HTMLInputElement,
  chatMessages: HTMLElement
): Promise<void>;

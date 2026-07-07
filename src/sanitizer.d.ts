/**
 * TypeScript Typings for Smadiums Sanitizer and Input Security Gateways.
 * @module sanitizer
 */

export function escapeHTML(str: string | null | undefined): string;
export function sanitizeAIResponse(text: string | null | undefined): string;
export function detectPromptInjection(input: string | null | undefined): boolean;

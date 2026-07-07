/**
 * TypeScript Typings for Smadiums GenAI Integration.
 * @module ai-client
 */

export function generateContent(
  type: 'chat' | 'incident' | 'sustainability',
  payload: Record<string, any>
): Promise<string>;

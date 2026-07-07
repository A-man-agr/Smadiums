/**
 * TypeScript Typings for Smadiums GenAI Integration.
 */

export function generateContent(
  type: 'chat' | 'incident' | 'sustainability',
  payload: Record<string, any>
): Promise<string>;

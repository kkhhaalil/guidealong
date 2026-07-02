import { describe, expect, it } from 'vitest';
import { tokens } from '../theme/tokens';

describe('design tokens', () => {
  it('exports primitive token scales', () => {
    expect(tokens.fontSize.displayXl).toBeTruthy();
    expect(tokens.spacing[4]).toBe('16px');
    expect(tokens.radius.poster).toBeTruthy();
    expect(tokens.motion.normal).toBeTruthy();
    expect(tokens.zIndex.sheet).toBeGreaterThan(tokens.zIndex.base);
  });
});

import { describe, expect, it } from 'vitest';
import { fuzzyMatch } from './fuzzyMatch';

describe('fuzzyMatch', () => {
  it('returns null if pattern is longer than text', () => {
    expect(fuzzyMatch('abcd', 'abc')).toBeNull();
  });

  it('matches exactly and returns high score', () => {
    const result = fuzzyMatch('user', 'user');
    expect(result).not.toBeNull();
    expect(result?.matches).toEqual([0, 1, 2, 3]);
  });

  it('is case insensitive', () => {
    const result1 = fuzzyMatch('UsEr', 'uSeR');
    expect(result1).not.toBeNull();
  });

  it('gives higher score to consecutive matches', () => {
    const r1 = fuzzyMatch('us', 'users'); // consecutive
    const r2 = fuzzyMatch('ur', 'users'); // scattered (u and r)

    expect(r1!.score).toBeGreaterThan(r2!.score);
  });

  it('gives bonus for prefix matching', () => {
    const r1 = fuzzyMatch('u', 'users'); // prefix match
    const r2 = fuzzyMatch('s', 'users'); // non-prefix match

    expect(r1!.score).toBeGreaterThan(r2!.score);
  });

  it('gives bonus for separator/camelCase matches', () => {
    const r1 = fuzzyMatch('ur', 'ui_roles'); // 'u' matches prefix, 'r' matches after '_'
    const r2 = fuzzyMatch('ur', 'uiroles'); // 'u' matches prefix, 'r' matches scattered

    expect(r1!.score).toBeGreaterThan(r2!.score);
  });

  it('returns null if sequence cannot be matched', () => {
    expect(fuzzyMatch('zx', 'users')).toBeNull();
    expect(fuzzyMatch('su', 'users')).toBeNull(); // Out of order
  });

  it('handles empty pattern', () => {
    expect(fuzzyMatch('', 'users')).toEqual({ score: 0, matches: [] });
  });

  it('handles empty text', () => {
    expect(fuzzyMatch('abc', '')).toBeNull();
  });
});

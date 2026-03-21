export interface MatchResult {
  score: number;
  matches: number[];
}

export function fuzzyMatch(pattern: string, text: string): MatchResult | null {
  if (!pattern) return { score: 0, matches: [] };
  if (!text) return null;

  const pLen = pattern.length;
  const tLen = text.length;

  if (pLen > tLen) return null;

  let pIdx = 0;
  let tIdx = 0;
  const matches: number[] = [];
  let score = 0;
  let consecutiveMatches = 0;

  const lowerPattern = pattern.toLowerCase();
  const lowerText = text.toLowerCase();

  while (pIdx < pLen && tIdx < tLen) {
    if (lowerPattern[pIdx] === lowerText[tIdx]) {
      matches.push(tIdx);

      // Base score for a match
      score += 10;

      // Bonus for consecutive matches
      if (consecutiveMatches > 0) {
        score += consecutiveMatches * 5;
      }
      consecutiveMatches++;

      // Bonus for prefix match (first character of the text)
      if (tIdx === 0) {
        score += 15;
      }

      // Bonus for camelCase or separator
      if (
        tIdx > 0 &&
        (text[tIdx - 1] === '_' ||
          text[tIdx - 1] === '-' ||
          text[tIdx - 1] === '.' ||
          (lowerText[tIdx - 1] === text[tIdx - 1] && text[tIdx] === text[tIdx].toUpperCase()))
      ) {
        score += 15;
      }

      pIdx++;
    } else {
      consecutiveMatches = 0;
    }
    tIdx++;
  }

  // Not all pattern characters matched
  if (pIdx < pLen) {
    return null;
  }

  // Penalty for unmatched characters to favor shorter text or closer matches
  score -= tLen - matches.length;

  return { score, matches };
}

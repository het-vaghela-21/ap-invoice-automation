/**
 * Helper to compute Levenshtein distance between two strings.
 */
function levenshtein(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[len1][len2];
}

/**
 * Calculates RapidFuzz-equivalent similarity score (0 to 100) using Levenshtein distance.
 */
export function ratio(s1, s2) {
  const str1 = (s1 || '').toLowerCase().trim();
  const str2 = (s2 || '').toLowerCase().trim();
  if (str1 === str2) return 100;
  if (!str1 || !str2) return 0;
  const dist = levenshtein(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return Math.round((1 - dist / maxLen) * 100);
}

/**
 * Calculates RapidFuzz-equivalent partial similarity score (0 to 100).
 * Compares the shorter string against all substrings of the longer string.
 */
export function partialRatio(s1, s2) {
  const str1 = (s1 || '').toLowerCase().trim();
  const str2 = (s2 || '').toLowerCase().trim();
  if (str1 === str2) return 100;
  if (!str1 || !str2) return 0;
  
  const shortStr = str1.length <= str2.length ? str1 : str2;
  const longStr = str1.length <= str2.length ? str2 : str1;
  
  const shortLen = shortStr.length;
  const longLen = longStr.length;
  
  let maxRatio = 0;
  for (let i = 0; i <= longLen - shortLen; i++) {
    const sub = longStr.substring(i, i + shortLen);
    const r = ratio(shortStr, sub);
    if (r > maxRatio) {
      maxRatio = r;
    }
    if (maxRatio === 100) break;
  }
  return maxRatio;
}

/**
 * Main Vendor Matching utility. Computes the maximum of simple ratio and partial ratio.
 */
export function getFuzzySimilarityScore(s1, s2) {
  const rVal = ratio(s1, s2);
  const prVal = partialRatio(s1, s2);
  return Math.max(rVal, prVal);
}

export default {
  ratio,
  partialRatio,
  getFuzzySimilarityScore
};

/**
 * Attempts to derive a valid branch name suggestion from an invalid one.
 *
 * Strategy:
 * 1. Lowercase everything
 * 2. Replace spaces and underscores with hyphens
 * 3. Strip characters that are not alphanumeric, hyphens, or slashes
 * 4. If the pattern contains a top-level alternation group (e.g. `(feature|fix|chore)`),
 *    and the branch doesn't start with one of those prefixes, prepend the first option.
 */
export default function suggestBranchName(branchName: string, branchPattern: string): string {
  const cleaned = branchName
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\-/]/g, '');

  // Try to extract an alternation group from the pattern, e.g. (feature|fix|chore)
  const alternationMatch = branchPattern.match(/\(([a-zA-Z][a-zA-Z0-9|]*)\)/);
  if (alternationMatch) {
    const options = alternationMatch[1]!.split('|');
    const alreadyPrefixed = options.some((opt) => cleaned.startsWith(`${opt}/`));
    if (!alreadyPrefixed && options[0]) {
      return `${options[0]}/${cleaned}`;
    }
  }

  return cleaned;
}

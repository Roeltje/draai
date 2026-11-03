// Wikipedia excerpts are fetched with a character cap and can stop mid-sentence.
// Keep only complete sentences: no text beats half a text.
const boundary = /[.!?]["'’”)]?(?=\s+["'‘“(]?[A-ZÀ-ÖØ-Þ]|\s*$)/g;
export function wholeSentences(text: string, maxChars = Infinity): string {
  const clean = text.replace(/\s+/g, " ").trim();
  let start = 0,
    kept = "";
  for (const match of clean.matchAll(boundary)) {
    const end = match.index + match[0].length;
    // Skip abbreviations and initials such as "o.a.", "J.", "St." or "Mr.".
    const word = /(\S+)[.!?]["'’”)]?$/.exec(clean.slice(start, end))?.[1] ?? "";
    if (
      match[0][0] === "." &&
      (word.includes(".") || (word.length <= 2 && /^[A-Z]/.test(word)))
    )
      continue;
    const next = clean.slice(0, end);
    if (next.length > maxChars) break;
    kept = next;
    start = end;
  }
  return kept.trim();
}

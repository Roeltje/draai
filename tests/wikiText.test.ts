import test from "node:test";
import assert from "node:assert/strict";
import { wholeSentences } from "../src/wikiText.ts";

test("drops a trailing cut-off sentence", () => {
  assert.equal(
    wholeSentences("Eerste zin is af. Tweede zin stopt midden in…"),
    "Eerste zin is af.",
  );
  assert.equal(wholeSentences("Alleen een afgebroken stuk tekst"), "");
});

test("keeps sentences within the budget, never a partial one", () => {
  const text = "Een korte zin. Nog een korte zin. En een derde zin hier.";
  assert.equal(wholeSentences(text, 35), "Een korte zin. Nog een korte zin.");
  assert.equal(wholeSentences(text, 10), "");
  assert.equal(wholeSentences(text), text);
});

test("does not split on abbreviations or initials", () => {
  assert.equal(
    wholeSentences("Met o.a. Sony en St. Louis als thuisbasis. Daarna kwam"),
    "Met o.a. Sony en St. Louis als thuisbasis.",
  );
  assert.equal(
    wholeSentences("Geproduceerd door J. Smith in 1982. Het album"),
    "Geproduceerd door J. Smith in 1982.",
  );
});

test("handles quotes, question marks and an ellipsis end", () => {
  assert.equal(
    wholeSentences('Is dit „Rock”? Ja, zeker. "Het werd een hit." Daarna...'),
    'Is dit „Rock”? Ja, zeker. "Het werd een hit."',
  );
});

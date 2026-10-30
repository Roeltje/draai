import test from "node:test";
import assert from "node:assert/strict";
import { styleCoverage } from "../src/styleCoverage.ts";
import { demoRecords } from "../server/demo.ts";
import { METADATA_MAX_AGE } from "../src/freshness.ts";
const now = Date.parse("2026-10-30T12:00:00Z");
const base = () => demoRecords(new Date(now).toISOString())[0];

test("style counts normalize case and spaces, count one style once per instance, preserve distinct copies", () => {
  const record = { ...base(), styles: ["  Soul  Jazz ", "soul jazz", "Funk"] };
  const second = { ...record, id: "copy", styles: ["SOUL   JAZZ"] };
  const result = styleCoverage(
    [record, record, second],
    [
      { style: "soul jazz", moods: ["warm"] },
      { style: "FUNK", moods: [] },
    ],
    now,
  );
  assert.equal(result.totalRecords, 2);
  assert.equal(result.missingStyles, 0);
  assert.deepEqual(result.styles, [
    { name: "Soul Jazz", count: 2, status: "mapped" },
    { name: "Funk", count: 1, status: "off" },
  ]);
});

test("unmapped styles sort by frequency and missing styles do not imply mapped coverage", () => {
  const record = base();
  const result = styleCoverage(
    [
      { ...record, id: "a", styles: ["Zouk", "Ambient"] },
      { ...record, id: "b", styles: ["Zouk"] },
      { ...record, id: "c", styles: ["", "   "] },
    ],
    [],
    now,
  );
  assert.equal(result.totalRecords, 3);
  assert.equal(result.missingStyles, 1);
  assert.deepEqual(result.styles, [
    { name: "Zouk", count: 2, status: "unmapped" },
    { name: "Ambient", count: 1, status: "unmapped" },
  ]);
});

test("coverage uses fresh available LPs and reports empty pools honestly", () => {
  const record = base();
  const result = styleCoverage(
    [
      { ...record, available: false },
      { ...record, id: "single", isLP: false },
      {
        ...record,
        id: "expired",
        demo: false,
        fetchedAt: new Date(now - METADATA_MAX_AGE).toISOString(),
      },
    ],
    [],
    now,
  );
  assert.deepEqual(result, { totalRecords: 0, missingStyles: 0, styles: [] });
  assert.deepEqual(styleCoverage([{ ...record, styles: [] }], [], now), {
    totalRecords: 1,
    missingStyles: 1,
    styles: [],
  });
});

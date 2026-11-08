import test from "node:test";
import assert from "node:assert/strict";

import {
  normalize, tokenize, parseCapture, searchMemories, retrieveRelevant,
  cleanTags, addLink, categoryId
} from "../../.test-dist/services/memory-engine.js";

const record = (id, text, extra = {}) => ({
  id, revision: 1,
  data: { text, category: "عمل", createdAt: "2026-11-08T08:00:00.000Z", ...extra }
});

test("Arabic normalization handles hamza, ta marbuta and Arabic-Indic digits", () => {
  assert.equal(normalize("إدارة مُهمّة ١٢٣"), normalize("اداره مهمه 123"));
  assert.deepEqual(tokenize("الاجتماعات والمشروعات"), ["اجتماعات", "والمشروعات"]);
});

test("capture extracts Arabic/English tags and @person links", () => {
  const parsed = parseCapture("اجتماع مع @Ahmed حول #LifeVault و #مشروع");
  assert.deepEqual(parsed.tags, ["LifeVault", "مشروع"]);
  assert.equal(parsed.links[0]?.label, "Ahmed");
  assert.equal(parsed.lang, "ar");
});

test("capture category and language detection are deterministic", () => {
  assert.equal(parseCapture("موعد قسط البنك").category, "finance");
  assert.equal(parseCapture("Project delivery meeting").lang, "en");
});

test("search ranks title and tags above body and filters archived records", () => {
  const records = [
    record("body", "LifeVault planning notes"),
    record("tag", "miscellaneous", { title: "Other", tags: ["LifeVault"] }),
    record("archived", "LifeVault old note", { archived: true })
  ];
  const results = searchMemories(records, "LifeVault", { archived: false }, Date.parse("2026-11-08T08:00:00Z"));
  assert.equal(results.length, 2);
  assert.equal(results[0].record.id, "tag");
  assert.ok(!results.some(x => x.record.id === "archived"));
});

test("relevant retrieval returns active records only and respects limit", () => {
  const records = [
    record("a", "LifeVault secure storage"),
    record("b", "LifeVault encrypted notes", { archived: true }),
    record("c", "LifeVault project roadmap")
  ];
  const results = retrieveRelevant(records, "LifeVault", 1, Date.parse("2026-11-08T08:00:00Z"));
  assert.equal(results.length, 1);
  assert.notEqual(results[0].record.id, "b");
});

test("tags and links are normalized and de-duplicated", () => {
  assert.deepEqual(cleanTags(["#LifeVault", "lifevault", "  #SecondBrain "]), ["LifeVault", "SecondBrain"]);
  const once = addLink([], { kind: "person", label: "Ahmed" });
  const twice = addLink(once, { kind: "person", label: " ahmed " });
  assert.equal(twice.length, 1);
  assert.equal(categoryId("FINANCE"), "finance");
});

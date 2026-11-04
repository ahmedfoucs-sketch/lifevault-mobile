// Run: npx tsx scripts/memory-engine.selftest.ts   (pure logic, no network)
import {
  normalize, parseCapture, detectCategory, searchMemories, retrieveRelevant, addLink, removeLink, linkIndex, categoryLabel,
  type MemoryRecord,
} from "../src/services/memory-engine";

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => { if (!cond) fails++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  " + extra}`); };
const rec = (id: string, text: string, extra: any = {}): MemoryRecord => ({
  id, revision: 1,
  data: { text, category: extra.category ?? "عام", createdAt: extra.createdAt ?? "2026-10-01T10:00:00Z", ...extra },
});

ok("normalize arabic variants", normalize("أَحْمَد ٣") === "احمد 3");
ok("normalize ta marbuta/alef maqsura", normalize("مدرسة على") === "مدرسه علي");

const p = parseCapture("اجتماع مشروع الرياض مع @أحمد #عمل #مهم");
ok("capture: category=work", p.category === "work");
ok("capture: tags", JSON.stringify(p.tags) === JSON.stringify(["عمل", "مهم"]), JSON.stringify(p.tags));
ok("capture: person link", p.links.length === 1 && p.links[0].kind === "person" && p.links[0].label === "أحمد");
ok("capture: lang ar", p.lang === "ar");
ok("capture: email is not a person", parseCapture("write to a@b.com").links.length === 0);
ok("capture: multiline title", parseCapture("Passport renewal\nbring 2 photos").title === "Passport renewal");
ok("category: English health", detectCategory("Doctor appointment and medicine") === "health");
ok("category: no false hit on كتاب", detectCategory("قرأت كتاب جديد") === "general");
ok("category: documents AR", detectCategory("تجديد جواز السفر") === "documents");
ok("categoryLabel en", categoryLabel("صحة", "en") === "Health");

const R: MemoryRecord[] = [
  rec("1", "موعد الدكتور يوم الخميس الساعة 5", { category: "صحة", createdAt: "2026-10-10T09:00:00Z" }),
  rec("2", "اجتماع مشروع الرياض مع العميل", { category: "عمل", links: [{ kind: "project", label: "مشروع الرياض" }, { kind: "person", label: "أحمد" }], tags: ["عمل"] }),
  rec("3", "Passport renewal needs 2 photos", { category: "وثائق", tags: ["travel"], createdAt: "2026-09-01T09:00:00Z" }),
  rec("4", "فاتورة الكهرباء قديمة", { category: "مالي", archived: true }),
  rec("5", "ملاحظة عامة عن الرياض", { createdAt: "2026-08-01T09:00:00Z" }),
  rec("6", "تذكير: تجديد التأمين", { kind: "reminder", category: "عام", dueAt: "2027-01-01T08:00:00Z" }),
];
const ids = (s: { record: MemoryRecord }[]) => s.map((x) => x.record.id);
const NOW = Date.parse("2026-10-14T00:00:00Z");

ok("search: arabic w/ hamza variant", ids(searchMemories(R, "الدكتور", {}, NOW))[0] === "1");
ok("search: ال-stem (طبيب-less) 'دكتور'", ids(searchMemories(R, "دكتور", {}, NOW)).includes("1"));
ok("search: project label outranks plain mention", ids(searchMemories(R, "الرياض", {}, NOW))[0] === "2", JSON.stringify(ids(searchMemories(R, "الرياض", {}, NOW))));
ok("search: english", ids(searchMemories(R, "passport", {}, NOW))[0] === "3");
ok("search: tag field", ids(searchMemories(R, "travel", {}, NOW)).includes("3"));
ok("search: archived hidden by default", !ids(searchMemories(R, "الكهرباء", {}, NOW)).includes("4"));
ok("search: archived view", ids(searchMemories(R, "الكهرباء", { archived: true }, NOW)).join() === "4");
ok("filter: category", ids(searchMemories(R, "", { category: "health" }, NOW)).join() === "1");
ok("filter: link", ids(searchMemories(R, "", { link: { kind: "person", label: "احمد" } }, NOW)).join() === "2");
ok("filter: kind reminder", ids(searchMemories(R, "", { kind: "reminder" }, NOW)).join() === "6");
ok("empty query => newest first", ids(searchMemories(R, "", {}, NOW))[0] === "1");
ok("no results for unrelated", searchMemories(R, "zzzz", {}, NOW).length === 0);

const rel = retrieveRelevant(R, "متى موعد الدكتور؟", 3, NOW);
ok("retrieve: stopwords ignored, health memory first", ids(rel)[0] === "1", JSON.stringify(ids(rel)));
ok("retrieve: excludes archived", !ids(retrieveRelevant(R, "فاتورة الكهرباء", 5, NOW)).includes("4"));

let L = addLink([], { kind: "project", label: "  Alpha " });
L = addLink(L, { kind: "project", label: "alpha" });
ok("links: dedupe case/space", L.length === 1 && L[0].label === "Alpha");
ok("links: remove", removeLink(L, { kind: "project", label: "ALPHA" }).length === 0);
ok("links: empty label ignored", addLink(L, { kind: "event", label: "  " }).length === 1);
ok("linkIndex counts (active only)", linkIndex(R).project[0]?.label === "مشروع الرياض");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);

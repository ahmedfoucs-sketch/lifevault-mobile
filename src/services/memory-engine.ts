/**
 * memory-engine.ts — LifeVault AI Second Brain (pure logic, no network, no UI).
 * Everything here runs on already-decrypted items, fully offline, free of any
 * external AI service: capture parsing, categorisation, Arabic/English search,
 * relevance ranking and link handling.
 *
 * Storage shape is a backward-compatible superset of AssistantView's MemoryItem
 * (text / category / createdAt / kind / reminder fields). New fields are optional.
 */

export type MemoryKind = "note" | "reminder";
export type LinkKind = "project" | "person" | "document" | "event";
export type Lang = "ar" | "en";

export interface MemoryLink {
  kind: LinkKind;
  label: string;
  /** Optional id of an existing vault/family/link item. Free-text links need none. */
  refId?: string;
}

export interface MemoryData {
  text: string;
  category: string; // stored as the Arabic label for compatibility with AssistantView
  createdAt: string;
  kind?: MemoryKind;
  // reminder fields (owned by AssistantView; never modified here)
  dueAt?: string;
  reminderStatus?: "pending" | "done";
  repeat?: "none" | "daily" | "weekly" | "monthly";
  advanceMinutes?: number;
  // second-brain fields
  title?: string;
  tags?: string[];
  links?: MemoryLink[];
  archived?: boolean;
  archivedAt?: string;
  updatedAt?: string;
  lang?: Lang;
}

export interface MemoryRecord {
  id: string;
  revision: number;
  data: MemoryData;
}

export const LINK_KINDS: LinkKind[] = ["project", "person", "document", "event"];

export const CATEGORIES = [
  { id: "work", ar: "عمل", en: "Work" },
  { id: "family", ar: "عائلة", en: "Family" },
  { id: "finance", ar: "مالي", en: "Finance" },
  { id: "health", ar: "صحة", en: "Health" },
  { id: "personal", ar: "شخصي", en: "Personal" },
  { id: "documents", ar: "وثائق", en: "Documents" },
  { id: "general", ar: "عام", en: "General" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

/* ---------- Normalisation / tokenisation (Arabic + English) ---------- */
const AR_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalize(s: string): string {
  return (s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(AR_MARKS, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

const stem = (t: string) => (t.length > 4 && t.startsWith("ال") ? t.slice(2) : t);

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(stem);
}

const STOP = new Set(
  [
    "في", "من", "على", "إلى", "عن", "ما", "ماذا", "هل", "هو", "هي", "أن", "إن", "أو", "ثم", "كان", "مع", "هذا", "هذه",
    "ذلك", "لا", "أنا", "لي", "لك", "كل", "متى", "أين", "من", "كيف", "the", "a", "an", "of", "to", "in", "on", "at",
    "and", "or", "is", "are", "was", "for", "with", "my", "me", "i", "it", "what", "when", "where", "who", "how", "do",
    "did", "about", "tell",
  ].map((w) => stem(normalize(w)))
);

export function queryTokens(q: string): string[] {
  const all = tokenize(q);
  const content = all.filter((t) => !STOP.has(t));
  return content.length ? content : all;
}

export function detectLang(text: string): Lang {
  const ar = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return ar >= latin ? "ar" : "en";
}

/* ---------- Categories ---------- */
const KEYWORDS: Record<Exclude<CategoryId, "general">, string[]> = {
  work: ["عمل", "وظيفة", "شركة", "اجتماع", "مشروع", "دوام", "عميل", "work", "job", "meeting", "project", "client", "office", "company"],
  family: ["أب", "أم", "ابن", "ابنة", "زوج", "زوجة", "عائلة", "أسرة", "أخ", "أخت", "أولاد", "family", "father", "mother", "son", "daughter", "wife", "husband", "kids", "brother", "sister"],
  finance: ["قسط", "راتب", "مال", "فلوس", "فاتورة", "دفع", "بنك", "إيجار", "سلفة", "salary", "bill", "invoice", "bank", "payment", "rent", "loan", "money", "tax", "installment"],
  health: ["طبيب", "دكتور", "دواء", "تحليل", "صحة", "مستشفى", "عيادة", "doctor", "medicine", "medication", "hospital", "clinic", "health"],
  personal: ["شخصي", "أفضل", "أحب", "تفضيل", "هواية", "prefer", "favorite", "favourite", "hobby"],
  documents: ["جواز", "هوية", "رخصة", "عقد", "وثيقة", "شهادة", "إقامة", "passport", "license", "licence", "contract", "document", "certificate", "visa"],
};
const KW_NORM = Object.fromEntries(
  Object.entries(KEYWORDS).map(([k, v]) => [k, v.map((w) => normalize(w))])
) as Record<string, string[]>;

export function detectCategory(text: string): CategoryId {
  const tokens = tokenize(text);
  let best: CategoryId = "general";
  let bestHits = 0;
  for (const c of CATEGORIES) {
    if (c.id === "general") continue;
    const kws = KW_NORM[c.id];
    const hits = tokens.filter((t) => kws.some((k) => t === k || (k.length >= 4 && t.startsWith(k)))).length;
    if (hits > bestHits) {
      best = c.id;
      bestHits = hits;
    }
  }
  return best;
}

/** Map a stored label (Arabic or English, any case) back to a category id, or null if custom. */
export function categoryId(stored: string | undefined): CategoryId | null {
  const n = normalize(stored ?? "");
  const hit = CATEGORIES.find((c) => normalize(c.ar) === n || c.en.toLowerCase() === n || c.id === n);
  return hit ? hit.id : null;
}
export function categoryLabel(stored: string | undefined, lang: Lang): string {
  const id = categoryId(stored);
  if (!id) return stored ?? "";
  const c = CATEGORIES.find((x) => x.id === id)!;
  return lang === "ar" ? c.ar : c.en;
}
/** Value persisted in `category` (Arabic label, for AssistantView compatibility). */
export const categoryStorage = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!.ar;

/* ---------- Links / tags ---------- */
export function sameLink(a: MemoryLink, b: MemoryLink): boolean {
  return a.kind === b.kind && normalize(a.label).trim() === normalize(b.label).trim();
}
export function addLink(links: MemoryLink[] | undefined, link: MemoryLink): MemoryLink[] {
  const label = link.label.trim();
  const cur = links ?? [];
  if (!label || !LINK_KINDS.includes(link.kind)) return cur;
  const next: MemoryLink = { kind: link.kind, label: label.slice(0, 80), ...(link.refId ? { refId: link.refId } : {}) };
  return cur.some((l) => sameLink(l, next)) ? cur : [...cur, next];
}
export function removeLink(links: MemoryLink[] | undefined, link: MemoryLink): MemoryLink[] {
  return (links ?? []).filter((l) => !sameLink(l, link));
}
export function cleanTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const t = raw.trim().replace(/^#/, "").trim().slice(0, 40);
    const k = normalize(t);
    if (t && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out.slice(0, 20);
}

/* ---------- Capture parsing ---------- */
export interface ParsedCapture {
  text: string;
  title?: string;
  tags: string[];
  links: MemoryLink[];
  category: CategoryId;
  lang: Lang;
}

/** Natural-language capture. Understands #tag and @person inline; everything else is plain text. */
export function parseCapture(raw: string): ParsedCapture {
  const text = raw.trim();
  const tags = cleanTags([...text.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]{2,40})/gu)].map((m) => m[1]));
  let links: MemoryLink[] = [];
  for (const m of text.matchAll(/(?:^|\s)@([\p{L}\p{N}_.-]{2,40})/gu)) {
    links = addLink(links, { kind: "person", label: m[1] });
  }
  const lines = text.split(/\r?\n/);
  const title = lines.length > 1 && lines[0].trim().length > 0 && lines[0].trim().length <= 80 ? lines[0].trim() : undefined;
  return { text, title, tags, links, category: detectCategory(text), lang: detectLang(text) };
}

/* ---------- Search & retrieval ---------- */
export interface Filters {
  category?: CategoryId | "all";
  archived?: boolean; // default false: only active memories
  kind?: MemoryKind | "all";
  link?: MemoryLink;
  tag?: string;
}
export interface Scored {
  record: MemoryRecord;
  score: number;
}

function fieldsOf(d: MemoryData) {
  const mk = (w: number, s: string) => ({ w, tokens: tokenize(s), norm: normalize(s) });
  // index 4 (text) is used for the exact-phrase bonus
  return [
    mk(3, d.title ?? ""),
    mk(3, (d.tags ?? []).join(" ")),
    mk(2, (d.links ?? []).map((l) => l.label).join(" ")),
    mk(1.5, d.category ?? ""),
    mk(1, d.text ?? ""),
  ];
}

function scoreOne(qTokens: string[], qNorm: string, d: MemoryData, now: number): number {
  const fields = fieldsOf(d);
  let score = 0;
  let matched = 0;
  for (const qt of qTokens) {
    let hit = 0;
    for (const f of fields) {
      if (!f.tokens.length) continue;
      if (f.tokens.includes(qt)) hit += f.w;
      else if (qt.length >= 2 && f.tokens.some((t) => t.startsWith(qt))) hit += f.w * 0.6;
      else if (qt.length >= 3 && f.norm.includes(qt)) hit += f.w * 0.3;
    }
    if (hit > 0) {
      score += hit;
      matched++;
    }
  }
  if (!score) return 0;
  score += (matched / qTokens.length) * 2;
  if (qTokens.length > 1 && fields[4].norm.includes(qNorm)) score += 3;
  const t = Date.parse(d.updatedAt ?? d.createdAt);
  if (!Number.isNaN(t)) score += 0.5 * Math.exp(-Math.max(0, now - t) / 86_400_000 / 180);
  return score;
}

function passes(d: MemoryData, f: Filters): boolean {
  if (!!d.archived !== !!f.archived) return false;
  if (f.kind && f.kind !== "all" && (d.kind ?? "note") !== f.kind) return false;
  if (f.category && f.category !== "all" && categoryId(d.category) !== f.category) return false;
  if (f.link && !(d.links ?? []).some((l) => sameLink(l, f.link!))) return false;
  if (f.tag) {
    const k = normalize(f.tag.replace(/^#/, ""));
    if (!(d.tags ?? []).some((t) => normalize(t) === k)) return false;
  }
  return true;
}

const byNewest = (a: MemoryRecord, b: MemoryRecord) =>
  (b.data.createdAt || "").localeCompare(a.data.createdAt || "");

/** Filter + rank. Empty query => newest first. */
export function searchMemories(
  records: MemoryRecord[],
  query: string,
  filters: Filters = {},
  now = Date.now()
): Scored[] {
  const pool = records.filter((r) => passes(r.data, filters));
  const qTokens = queryTokens(query);
  if (!qTokens.length) return pool.sort(byNewest).map((record) => ({ record, score: 0 }));
  const qNorm = normalize(query).trim();
  return pool
    .map((record) => ({ record, score: scoreOne(qTokens, qNorm, record.data, now) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.record, b.record));
}

/** "What do I already know about this?" — top relevant active memories for a free-text context. */
export function retrieveRelevant(records: MemoryRecord[], context: string, limit = 5, now = Date.now()): Scored[] {
  return searchMemories(records, context, { archived: false }, now)
    .filter((s) => s.score >= 1)
    .slice(0, limit);
}

/** Distinct link labels per kind, most used first (for filter chips / autocomplete). */
export function linkIndex(records: MemoryRecord[]): Record<LinkKind, { label: string; count: number }[]> {
  const out = { project: [], person: [], document: [], event: [] } as Record<LinkKind, { label: string; count: number }[]>;
  for (const r of records) {
    if (r.data.archived) continue;
    for (const l of r.data.links ?? []) {
      const list = out[l.kind];
      const hit = list.find((x) => normalize(x.label) === normalize(l.label));
      if (hit) hit.count++;
      else list.push({ label: l.label, count: 1 });
    }
  }
  for (const k of LINK_KINDS) out[k].sort((a, b) => b.count - a.count);
  return out;
}

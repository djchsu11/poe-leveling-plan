import type {
  AcquisitionKind,
  GemAcquisition,
  GemDatabase,
  GemInfo,
  PrimaryAttr,
} from "./types";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+support$/i, " support")
    .trim();
}

/** Strip alt-quality / awakened prefixes so we can match base gem rewards. */
function baseGemName(name: string): string {
  return name
    .replace(/^(anomalous|divergent|phantasmal)\s+/i, "")
    .replace(/^awakened\s+/i, "")
    .trim();
}

function parseAct(act: string | number): number {
  const n = typeof act === "number" ? act : Number(String(act).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 99;
}

function classMatches(classes: string[] | undefined, className: string): boolean {
  // Empty class list means available to all classes
  if (!classes || classes.length === 0) return true;
  const target = className.toLowerCase();
  return classes.some((c) => c.toLowerCase() === target);
}

function requiredLevel(gem: GemInfo): number {
  const n = Number(gem.required_level);
  return Number.isFinite(n) ? n : 1;
}

/** Prefer leveled act vendors over Siosa/Lilly when act is equal. */
function vendorRank(npc?: string): number {
  const n = (npc ?? "").toLowerCase();
  if (n.includes("lilly")) return 3;
  if (n.includes("siosa")) return 2;
  return 1;
}

export function buildGemIndex(db: GemDatabase): Map<string, GemInfo> {
  const index = new Map<string, GemInfo>();
  for (const gem of db.gems) {
    index.set(normalizeName(gem.name), gem);

    const withoutSupport = normalizeName(gem.name.replace(/\s+Support$/i, ""));
    if (!index.has(withoutSupport)) {
      index.set(withoutSupport, gem);
    }
  }
  return index;
}

export function findGemInfo(
  index: Map<string, GemInfo>,
  gemName: string,
): GemInfo | undefined {
  const candidates = [
    gemName,
    baseGemName(gemName),
    `${gemName} Support`,
    `${baseGemName(gemName)} Support`,
    gemName.replace(/\s+Support$/i, ""),
    baseGemName(gemName).replace(/\s+Support$/i, ""),
  ];

  // Prefer exact / prefixed matches before stripping Vaal
  for (const candidate of candidates) {
    const key = normalizeName(candidate);
    if (index.has(key)) return index.get(key);
  }

  // Vaal gems: try base skill if Vaal variant has no campaign source entry
  const withoutVaal = baseGemName(gemName).replace(/^vaal\s+/i, "").trim();
  if (withoutVaal && withoutVaal.toLowerCase() !== gemName.toLowerCase()) {
    for (const candidate of [withoutVaal, `${withoutVaal} Support`]) {
      const key = normalizeName(candidate);
      if (index.has(key)) return index.get(key);
    }
  }

  return undefined;
}

interface Candidate {
  kind: AcquisitionKind;
  act: number;
  quest: string;
  npc?: string;
}

function candidatesForClass(gem: GemInfo, className: string): Candidate[] {
  const out: Candidate[] = [];

  for (const q of gem.quest_rewards ?? []) {
    if (!classMatches(q.classes, className)) continue;
    out.push({
      kind: "quest",
      act: parseAct(q.act),
      quest: q.quest,
    });
  }

  for (const v of gem.vendor_rewards ?? []) {
    if (!classMatches(v.classes, className)) continue;
    out.push({
      kind: "vendor",
      act: parseAct(v.act),
      quest: v.quest,
      npc: v.npc,
    });
  }

  return out;
}

function sortCandidates(a: Candidate, b: Candidate): number {
  if (a.act !== b.act) return a.act - b.act;
  if (a.kind !== b.kind) return a.kind === "quest" ? -1 : 1;
  if (a.kind === "vendor" && b.kind === "vendor") {
    const vr = vendorRank(a.npc) - vendorRank(b.npc);
    if (vr !== 0) return vr;
  }
  return a.quest.localeCompare(b.quest);
}

/**
 * Earliest acquisition for the given class.
 * Prefers quest rewards, then early act vendors (Nessa/Clarissa/etc over Siosa/Lilly).
 */
export function earliestAcquisition(
  gem: GemInfo,
  className: string,
): GemAcquisition | null {
  const candidates = candidatesForClass(gem, className);
  if (candidates.length === 0) return null;

  candidates.sort(sortCandidates);

  const best = candidates[0];
  return {
    kind: best.kind,
    act: best.act,
    quest: best.quest,
    npc: best.npc,
    gemName: gem.name,
    primaryAttr: gem.primary_attr as PrimaryAttr,
    requiredLevel: requiredLevel(gem),
  };
}

export function matchGem(
  index: Map<string, GemInfo>,
  gemName: string,
  className: string,
): GemAcquisition | null {
  const info = findGemInfo(index, gemName);
  if (!info) return null;
  return earliestAcquisition(info, className);
}

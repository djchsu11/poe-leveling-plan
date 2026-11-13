/**
 * Refresh src/data/gems.json from poewiki cargo tables.
 * Usage: node scripts/fetch-gems.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/data/gems.json");
const API = "https://www.poewiki.net/w/api.php";
const LIMIT = 500;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cargoQuery(params) {
  const url = new URL(API);
  url.searchParams.set("action", "cargoquery");
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "poe-leveling-plan/0.1 (local gem refresh)" },
  });
  if (!res.ok) {
    throw new Error(`Wiki API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(`Wiki cargo error: ${JSON.stringify(json.error)}`);
  }
  return json.cargoquery ?? [];
}

async function fetchAll(params) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const chunk = await cargoQuery({ ...params, limit: String(LIMIT), offset: String(offset) });
    rows.push(...chunk);
    console.log(`  fetched ${rows.length} (+${chunk.length})`);
    if (chunk.length < LIMIT) break;
    offset += LIMIT;
    await sleep(400);
  }
  return rows.map((r) => r.title);
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function splitClasses(raw) {
  if (!raw || !String(raw).trim()) return [];
  // Wiki uses various delimiters across exports
  return String(raw)
    .split(/[¦,;|]/)
    .map((s) => decodeEntities(s).trim())
    .filter(Boolean);
}

function ensureGem(map, row) {
  const name = row.name;
  if (!name) return null;
  if (!map.has(name)) {
    map.set(name, {
      name,
      required_level: row["required level"] ?? row.required_level ?? "1",
      primary_attr: row["primary attribute"] ?? row.primary_attribute ?? "",
      vendor_rewards: [],
      quest_rewards: [],
    });
  }
  return map.get(name);
}

async function main() {
  const gems = new Map();

  console.log("Fetching base gem list…");
  for (const classId of ["Active Skill Gem", "Support Skill Gem"]) {
    const rows = await fetchAll({
      tables: "items,skill_gems",
      join_on: "items._pageName=skill_gems._pageName",
      fields:
        "items.name,items.required_level,skill_gems.primary_attribute",
      where: `items.class_id="${classId}"`,
    });
    for (const row of rows) ensureGem(gems, row);
    await sleep(400);
  }

  console.log("Fetching vendor rewards…");
  for (const classId of ["Active Skill Gem", "Support Skill Gem"]) {
    const rows = await fetchAll({
      tables: "items,skill_gems,vendor_rewards",
      join_on:
        "items._pageName=skill_gems._pageName,items._pageName=vendor_rewards._pageName",
      fields:
        "items.name,items.required_level,skill_gems.primary_attribute,vendor_rewards.npc,vendor_rewards.quest,vendor_rewards.act,vendor_rewards.classes",
      where: `items.class_id="${classId}"`,
    });
    for (const row of rows) {
      const gem = ensureGem(gems, row);
      if (!gem) continue;
      if (!row.npc && !row.quest && !row.act) continue;
      gem.vendor_rewards.push({
        npc: decodeEntities(row.npc ?? ""),
        quest: decodeEntities(row.quest ?? ""),
        act: row.act ?? "",
        classes: splitClasses(row.classes),
      });
    }
    await sleep(400);
  }

  console.log("Fetching quest rewards…");
  for (const classId of ["Active Skill Gem", "Support Skill Gem"]) {
    const rows = await fetchAll({
      tables: "items,skill_gems,quest_rewards",
      join_on:
        "items._pageName=skill_gems._pageName,items._pageName=quest_rewards._pageName",
      fields:
        "items.name,items.required_level,skill_gems.primary_attribute,quest_rewards.quest,quest_rewards.act,quest_rewards.classes",
      where: `items.class_id="${classId}"`,
    });
    for (const row of rows) {
      const gem = ensureGem(gems, row);
      if (!gem) continue;
      if (!row.quest && !row.act) continue;
      gem.quest_rewards.push({
        quest: decodeEntities(row.quest ?? ""),
        act: row.act ?? "",
        classes: splitClasses(row.classes),
      });
    }
    await sleep(400);
  }

  // Deduplicate reward rows
  for (const gem of gems.values()) {
    const vKey = (v) =>
      `${v.npc}|${v.quest}|${v.act}|${(v.classes || []).join(",")}`;
    const qKey = (q) =>
      `${q.quest}|${q.act}|${(q.classes || []).join(",")}`;
    gem.vendor_rewards = [...new Map(gem.vendor_rewards.map((v) => [vKey(v), v])).values()];
    gem.quest_rewards = [...new Map(gem.quest_rewards.map((q) => [qKey(q), q])).values()];
  }

  const list = [...gems.values()].sort((a, b) => a.name.localeCompare(b.name));
  const withVendor = list.filter((g) => g.vendor_rewards.length > 0).length;
  const withQuest = list.filter((g) => g.quest_rewards.length > 0).length;
  console.log(
    `Writing ${list.length} gems (${withVendor} with vendors, ${withQuest} with quests) → ${OUT}`,
  );
  writeFileSync(OUT, JSON.stringify({ gems: list }, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

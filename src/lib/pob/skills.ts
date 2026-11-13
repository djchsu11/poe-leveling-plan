export interface PobGem {
  name: string;
  skillId: string;
  level: number;
  quality: number;
  enabled: boolean;
  support: boolean;
}

export interface PobSkillGroup {
  label: string;
  slot: string;
  enabled: boolean;
  gems: PobGem[];
}

export interface PobSkillSet {
  id: string;
  title: string;
  skillGroups: PobSkillGroup[];
}

export interface PobBuildSummary {
  className: string;
  ascendClassName: string;
  level: number;
  activeSkillSetId: string;
  /** Auto-picked set used for the plan unless the user overrides. */
  preferredSkillSetId: string;
  /** Skill set currently used for skillGroups. */
  selectedSkillSetId: string;
  skillSets: PobSkillSet[];
  /** Groups from the preferred (or selected) skill set. */
  skillGroups: PobSkillGroup[];
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function attr(obj: Record<string, unknown>, key: string): string {
  const v = obj[`@_${key}`] ?? obj[key];
  return v == null ? "" : String(v);
}

function gemDisplayName(gem: Record<string, unknown>): string {
  // Modern PoB saves nameSpec; older exports sometimes used name
  const nameSpec = attr(gem, "nameSpec").trim();
  if (nameSpec) return nameSpec;

  const name = attr(gem, "name").trim();
  if (name) return name;

  const skillId = attr(gem, "skillId").trim();
  if (!skillId) return "Unknown Gem";

  return skillId
    .replace(/^Support/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function isSupportGem(gem: Record<string, unknown>, name: string): boolean {
  const skillId = attr(gem, "skillId");
  if (skillId.startsWith("Support")) return true;
  return /\bSupport\b/i.test(name);
}

function parseSkillGroups(skillNodes: Record<string, unknown>[]): PobSkillGroup[] {
  const skillGroups: PobSkillGroup[] = [];

  for (const skill of skillNodes) {
    // Item-granted abilities are not bought as gems
    if (attr(skill, "source")) continue;

    const gems = asArray(skill.Gem as Record<string, unknown>[])
      .map((gem) => {
        const name = gemDisplayName(gem);
        return {
          name,
          skillId: attr(gem, "skillId"),
          level: Number(attr(gem, "level") || "1") || 1,
          quality: Number(attr(gem, "quality") || "0") || 0,
          enabled: attr(gem, "enabled") !== "false",
          support: isSupportGem(gem, name),
        } satisfies PobGem;
      })
      .filter((g) => g.name && g.name !== "Unknown Gem");

    if (gems.length === 0) continue;

    skillGroups.push({
      label: attr(skill, "label") || "",
      slot: attr(skill, "slot") || "Unassigned",
      enabled: attr(skill, "enabled") !== "false",
      gems,
    });
  }

  return skillGroups;
}

function averageGemLevel(groups: PobSkillGroup[]): number {
  let total = 0;
  let count = 0;
  for (const g of groups) {
    for (const gem of g.gems) {
      total += gem.level;
      count += 1;
    }
  }
  return count === 0 ? 999 : total / count;
}

function looksLikeLeveling(title: string): boolean {
  return /level|lvl|leveling|levelling|campaign|acts?/i.test(title);
}

/**
 * Prefer a leveling-named set, else the lowest average gem level set,
 * else the active set, else the first set with gems.
 */
export function pickPreferredSkillSetId(
  skillSets: PobSkillSet[],
  activeSkillSetId: string,
): string {
  const withGems = skillSets.filter((s) => s.skillGroups.length > 0);
  if (withGems.length === 0) {
    return activeSkillSetId || skillSets[0]?.id || "1";
  }

  const leveling = withGems.find((s) => looksLikeLeveling(s.title));
  if (leveling) return leveling.id;

  const byGemLevel = [...withGems].sort(
    (a, b) => averageGemLevel(a.skillGroups) - averageGemLevel(b.skillGroups),
  );
  const lowest = byGemLevel[0];
  const active = withGems.find((s) => s.id === activeSkillSetId);

  // If the active set is clearly endgame (avg gem level much higher), prefer lowest
  if (
    active &&
    lowest &&
    averageGemLevel(active.skillGroups) >= 15 &&
    averageGemLevel(lowest.skillGroups) < averageGemLevel(active.skillGroups) - 3
  ) {
    return lowest.id;
  }

  if (active) return active.id;
  return lowest.id;
}

export function extractBuild(
  doc: Record<string, unknown>,
  selectedSkillSetId?: string,
): PobBuildSummary {
  const build = (doc.Build ?? {}) as Record<string, unknown>;
  const className = attr(build, "className") || "Unknown";
  const ascendClassName = attr(build, "ascendClassName") || "";
  const level = Number(attr(build, "level") || "1") || 1;

  const skillsRoot = (doc.Skills ?? {}) as Record<string, unknown>;
  const activeSkillSetId = attr(skillsRoot, "activeSkillSet") || "1";

  const skillSets: PobSkillSet[] = [];

  // Modern PoB: skills live inside SkillSet nodes
  const skillSetNodes = asArray(
    skillsRoot.SkillSet as Record<string, unknown>[],
  );
  for (const node of skillSetNodes) {
    const id = attr(node, "id") || String(skillSets.length + 1);
    const title = attr(node, "title") || `Skill Set ${id}`;
    const groups = parseSkillGroups(
      asArray(node.Skill as Record<string, unknown>[]),
    );
    skillSets.push({ id, title, skillGroups: groups });
  }

  // Legacy PoB: Skill nodes directly under Skills
  const legacySkills = asArray(skillsRoot.Skill as Record<string, unknown>[]);
  if (legacySkills.length > 0) {
    const groups = parseSkillGroups(legacySkills);
    const existing = skillSets.find((s) => s.id === "1");
    if (existing) {
      existing.skillGroups.push(...groups);
    } else {
      skillSets.push({
        id: "1",
        title: "Default",
        skillGroups: groups,
      });
    }
  }

  if (skillSets.length === 0) {
    skillSets.push({ id: "1", title: "Default", skillGroups: [] });
  }

  const preferredSkillSetId = pickPreferredSkillSetId(
    skillSets,
    activeSkillSetId,
  );
  const useId =
    selectedSkillSetId && skillSets.some((s) => s.id === selectedSkillSetId)
      ? selectedSkillSetId
      : preferredSkillSetId;

  const selected =
    skillSets.find((s) => s.id === useId) ?? skillSets[0];

  return {
    className,
    ascendClassName,
    level,
    activeSkillSetId,
    preferredSkillSetId,
    selectedSkillSetId: useId,
    skillSets,
    skillGroups: selected.skillGroups,
  };
}

export function uniqueGemNames(build: PobBuildSummary): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const group of build.skillGroups) {
    for (const gem of group.gems) {
      const key = gem.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(gem.name);
    }
  }
  return names;
}

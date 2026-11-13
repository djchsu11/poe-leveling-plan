import { buildGemIndex, findGemInfo, matchGem } from "../gems/match";
import {
  attrToColor,
  type GemAcquisition,
  type GemDatabase,
  type SocketColor,
} from "../gems/types";
import type { PobBuildSummary, PobSkillGroup } from "../pob/skills";
import { extractBuild, uniqueGemNames } from "../pob/skills";
import { loadPobDocument } from "../pob/decode";

export interface PlannedGem {
  name: string;
  color: SocketColor;
  acquisition: GemAcquisition | null;
  unavailable: boolean;
}

export interface ActQuestGroup {
  quest: string;
  npc?: string;
  kind: "quest" | "vendor";
  gems: PlannedGem[];
}

export interface ActSection {
  act: number;
  groups: ActQuestGroup[];
}

export interface SocketTargetGem {
  name: string;
  color: SocketColor;
  availableAct: number | null;
  unavailable: boolean;
}

export interface SocketTarget {
  id: string;
  label: string;
  slot: string;
  linkSize: number;
  colors: SocketColor[];
  colorPattern: string;
  gems: SocketTargetGem[];
  readyAct: number | null;
  enabled: boolean;
}

export interface SkillSetOption {
  id: string;
  title: string;
  gemCount: number;
}

export interface LevelingPlan {
  className: string;
  ascendClassName: string;
  level: number;
  selectedSkillSetId: string;
  preferredSkillSetId: string;
  skillSets: SkillSetOption[];
  acts: ActSection[];
  socketTargets: SocketTarget[];
  unmatchedGems: string[];
  /** Gems in the checklist that somehow aren't in any socket group (should be rare). */
  gemsMissingFromSockets: string[];
}

function groupKey(acq: GemAcquisition): string {
  return `${acq.kind}|${acq.quest}|${acq.npc ?? ""}`;
}

function buildSocketTarget(
  group: PobSkillGroup,
  index: number,
  gemIndex: ReturnType<typeof buildGemIndex>,
  className: string,
): SocketTarget {
  const gems: SocketTargetGem[] = group.gems.map((g) => {
    const info = findGemInfo(gemIndex, g.name);
    const acq = matchGem(gemIndex, g.name, className);
    const color = info ? attrToColor(info.primary_attr) : ("W" as SocketColor);
    return {
      name: info?.name ?? g.name,
      color,
      availableAct: acq?.act ?? null,
      unavailable: !acq,
    };
  });

  const colors = gems.map((g) => g.color);
  const acts = gems
    .map((g) => g.availableAct)
    .filter((a): a is number => a != null);
  const readyAct =
    gems.some((g) => g.unavailable) || acts.length < gems.length
      ? null
      : Math.max(...acts);

  const label =
    group.label ||
    group.gems.find((g) => !g.support)?.name ||
    group.gems[0]?.name ||
    "Socket group";

  return {
    id: `socket-${index}-${group.slot}-${label}`,
    label,
    slot: group.slot,
    linkSize: gems.length,
    colors,
    colorPattern: colors.join("-"),
    gems,
    readyAct,
    enabled: group.enabled,
  };
}

export function buildLevelingPlan(
  build: PobBuildSummary,
  db: GemDatabase,
): LevelingPlan {
  const gemIndex = buildGemIndex(db);
  const className = build.className;

  const plannedByName = new Map<string, PlannedGem>();
  const unmatchedGems: string[] = [];

  for (const name of uniqueGemNames(build)) {
    const info = findGemInfo(gemIndex, name);
    const acq = matchGem(gemIndex, name, className);
    const displayName = info?.name ?? name;

    if (!info) {
      unmatchedGems.push(name);
      plannedByName.set(name.toLowerCase(), {
        name,
        color: "W",
        acquisition: null,
        unavailable: true,
      });
      continue;
    }

    plannedByName.set(displayName.toLowerCase(), {
      name: displayName,
      color: attrToColor(info.primary_attr),
      acquisition: acq,
      unavailable: !acq,
    });

    if (!acq) {
      unmatchedGems.push(displayName);
    }
  }

  const actMap = new Map<number, Map<string, ActQuestGroup>>();

  for (const planned of plannedByName.values()) {
    if (!planned.acquisition) continue;
    const acq = planned.acquisition;
    if (!actMap.has(acq.act)) actMap.set(acq.act, new Map());
    const groups = actMap.get(acq.act)!;
    const key = groupKey(acq);
    if (!groups.has(key)) {
      groups.set(key, {
        quest: acq.quest,
        npc: acq.npc,
        kind: acq.kind,
        gems: [],
      });
    }
    groups.get(key)!.gems.push(planned);
  }

  const acts: ActSection[] = [...actMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter(([act]) => act >= 1 && act <= 10)
    .map(([act, groups]) => ({
      act,
      groups: [...groups.values()]
        .map((g) => ({
          ...g,
          gems: g.gems.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => {
          if (a.kind !== b.kind) return a.kind === "quest" ? -1 : 1;
          return a.quest.localeCompare(b.quest);
        }),
    }));

  // Include every socket group with gems (enabled or not) so checklist gems
  // always have a matching link recommendation.
  const socketTargets = build.skillGroups
    .map((g, i) => ({ group: g, i }))
    .filter(({ group }) => group.gems.length > 0)
    .map(({ group, i }) => buildSocketTarget(group, i, gemIndex, className));

  const socketGemNames = new Set(
    socketTargets.flatMap((t) => t.gems.map((g) => g.name.toLowerCase())),
  );
  const gemsMissingFromSockets = [...plannedByName.values()]
    .map((g) => g.name)
    .filter((name) => !socketGemNames.has(name.toLowerCase()))
    .sort();

  return {
    className: build.className,
    ascendClassName: build.ascendClassName,
    level: build.level,
    selectedSkillSetId: build.selectedSkillSetId,
    preferredSkillSetId: build.preferredSkillSetId,
    skillSets: build.skillSets.map((s) => ({
      id: s.id,
      title: s.title || `Skill Set ${s.id}`,
      gemCount: s.skillGroups.reduce((n, g) => n + g.gems.length, 0),
    })),
    acts,
    socketTargets,
    unmatchedGems: [...new Set(unmatchedGems)].sort(),
    gemsMissingFromSockets,
  };
}

export function planFromImportCode(
  importCode: string,
  db: GemDatabase,
  skillSetId?: string,
): LevelingPlan {
  const doc = loadPobDocument(importCode);
  const build = extractBuild(doc, skillSetId);
  return buildLevelingPlan(build, db);
}

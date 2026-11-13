import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import gemDb from "../../data/gems.json";
import type { GemDatabase } from "../gems/types";
import { planFromImportCode } from "../plan/buildPlan";
import { decodePobImportCode, loadPobDocument } from "./decode";
import { extractBuild } from "./skills";

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(dir, "fixture-code.txt"), "utf8").trim();
const modern = readFileSync(join(dir, "fixture-modern.txt"), "utf8").trim();

describe("PoB decode", () => {
  it("inflates fixture XML", () => {
    const xml = decodePobImportCode(fixture);
    expect(xml).toContain("PathOfBuilding");
    expect(xml).toContain("Fireball");
  });

  it("extracts class and skill groups from legacy layout", () => {
    const build = extractBuild(loadPobDocument(fixture));
    expect(build.className).toBe("Witch");
    expect(build.ascendClassName).toBe("Elementalist");
    expect(build.skillGroups.length).toBeGreaterThanOrEqual(2);
    expect(build.skillGroups[0].gems.some((g) => g.name === "Fireball")).toBe(
      true,
    );
  });

  it("builds an act plan with socket colors and vendor fallbacks", () => {
    const plan = planFromImportCode(fixture, gemDb as GemDatabase);
    expect(plan.className).toBe("Witch");
    expect(plan.acts.length).toBeGreaterThan(0);
    expect(plan.socketTargets[0].colorPattern.length).toBeGreaterThan(0);
    expect(plan.gemsMissingFromSockets).toEqual([]);
    const fireball = plan.acts
      .flatMap((a) => a.groups.flatMap((g) => g.gems))
      .find((g) => /fireball/i.test(g.name));
    expect(fireball).toBeTruthy();
    expect(fireball?.color).toBe("B");
    // Fireball is vendor-purchased for Witch (Nessa), not always a quest reward
    const fireballGroup = plan.acts
      .flatMap((a) => a.groups)
      .find((g) => g.gems.some((gem) => /fireball/i.test(gem.name)));
    expect(fireballGroup?.kind === "vendor" || fireballGroup?.kind === "quest").toBe(
      true,
    );
  });

  it("reads SkillSet loadouts and prefers leveling over active endgame", () => {
    const build = extractBuild(loadPobDocument(modern));
    expect(build.className).toBe("Witch");
    expect(build.level).toBe(100);
    expect(build.skillSets).toHaveLength(2);
    expect(build.activeSkillSetId).toBe("2");
    expect(build.preferredSkillSetId).toBe("1");
    expect(build.selectedSkillSetId).toBe("1");
    expect(
      build.skillGroups.some((g) =>
        g.gems.some((gem) => gem.name === "Freezing Pulse"),
      ),
    ).toBe(true);

    const plan = planFromImportCode(modern, gemDb as GemDatabase);
    expect(plan.selectedSkillSetId).toBe("1");
    expect(
      plan.acts
        .flatMap((a) => a.groups.flatMap((g) => g.gems))
        .some((g) => /freezing pulse/i.test(g.name)),
    ).toBe(true);

    const endgame = planFromImportCode(modern, gemDb as GemDatabase, "2");
    expect(endgame.selectedSkillSetId).toBe("2");
    expect(
      endgame.acts
        .flatMap((a) => a.groups.flatMap((g) => g.gems))
        .some((g) => /fireball/i.test(g.name)),
    ).toBe(true);
  });
});

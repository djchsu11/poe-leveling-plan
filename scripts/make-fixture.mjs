import { deflateSync } from "node:zlib";

const legacyXml = `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
<Build level="90" className="Witch" ascendClassName="Elementalist" targetVersion="3_25"/>
<Skills sortGemsByDPSField="CombinedDPS">
<Skill enabled="true" slot="Body Armour" label="Main" mainActiveSkill="1">
<Gem level="20" quality="20" enabled="true" name="Fireball" skillId="Fireball"/>
<Gem level="20" quality="20" enabled="true" name="Controlled Destruction Support" skillId="SupportControlledDestruction"/>
<Gem level="20" quality="20" enabled="true" name="Elemental Focus Support" skillId="SupportElementalFocus"/>
</Skill>
<Skill enabled="true" slot="Weapon 1" label="Movement" mainActiveSkill="1">
<Gem level="20" quality="0" enabled="true" name="Flame Dash" skillId="FlameDash"/>
</Skill>
</Skills>
</PathOfBuilding>
`;

const modernXml = `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
<Build level="100" className="Witch" ascendClassName="Elementalist" targetVersion="3_25"/>
<Skills activeSkillSet="2" sortGemsByDPSField="CombinedDPS">
<SkillSet id="1" title="Leveling">
<Skill enabled="true" slot="Body Armour" label="Leveling Main" mainActiveSkill="1">
<Gem level="1" quality="0" enabled="true" nameSpec="Freezing Pulse" skillId="FreezingPulse" gemId="Metadata/Items/Gems/SkillGemFreezingPulse"/>
<Gem level="1" quality="0" enabled="true" nameSpec="Arcane Surge Support" skillId="SupportArcaneSurge" gemId="Metadata/Items/Gems/SupportGemArcaneSurge"/>
</Skill>
<Skill enabled="true" slot="Boots" label="Movement" mainActiveSkill="1">
<Gem level="4" quality="0" enabled="true" nameSpec="Flame Dash" skillId="FlameDash" gemId="Metadata/Items/Gems/SkillGemFlameDash"/>
</Skill>
</SkillSet>
<SkillSet id="2" title="Endgame">
<Skill enabled="true" slot="Body Armour" label="Main" mainActiveSkill="1">
<Gem level="21" quality="23" enabled="true" nameSpec="Fireball" skillId="Fireball" gemId="Metadata/Items/Gems/SkillGemFireball"/>
<Gem level="20" quality="20" enabled="true" nameSpec="Controlled Destruction Support" skillId="SupportControlledDestruction"/>
<Gem level="20" quality="20" enabled="true" nameSpec="Elemental Focus Support" skillId="SupportElementalFocus"/>
</Skill>
</SkillSet>
</Skills>
</PathOfBuilding>
`;

function encode(xml) {
  return deflateSync(Buffer.from(xml, "utf8"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const args = process.argv.slice(2);
const kind = args[0] === "modern" ? "modern" : "legacy";
process.stdout.write(encode(kind === "modern" ? modernXml : legacyXml));

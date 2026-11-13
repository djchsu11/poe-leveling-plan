import type { SkillSetOption } from "../lib/plan/buildPlan";

interface SkillSetPickerProps {
  skillSets: SkillSetOption[];
  selectedId: string;
  preferredId: string;
  onChange: (id: string) => void;
}

export function SkillSetPicker({
  skillSets,
  selectedId,
  preferredId,
  onChange,
}: SkillSetPickerProps) {
  if (skillSets.length <= 1) return null;

  return (
    <div className="skillset-picker">
      <label htmlFor="skill-set">Skill set / loadout</label>
      <select
        id="skill-set"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
      >
        {skillSets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
            {s.id === preferredId ? " (suggested)" : ""}
            {s.gemCount > 0 ? ` · ${s.gemCount} gems` : " · empty"}
          </option>
        ))}
      </select>
    </div>
  );
}

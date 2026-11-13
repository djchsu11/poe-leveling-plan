import type { LevelingPlan } from "../lib/plan/buildPlan";
import { ColorPip } from "./ColorPips";

export function ActPlan({ plan }: { plan: LevelingPlan }) {
  return (
    <section className="panel act-plan">
      <h2>Act checklist</h2>
      {plan.acts.length === 0 ? (
        <p className="muted">No campaign gem sources matched for this class.</p>
      ) : (
        <div className="act-sections">
          {plan.acts.map((section) => (
            <article key={section.act} className="act-section">
              <h3>Act {section.act}</h3>
              {section.groups.map((group) => (
                <div
                  key={`${group.kind}-${group.quest}-${group.npc ?? ""}`}
                  className="quest-group"
                >
                  <div className="quest-header">
                    <span className={`badge badge-${group.kind}`}>
                      {group.kind === "quest" ? "Reward" : "Buy"}
                    </span>
                    {group.kind === "vendor" && group.npc ? (
                      <span className="quest-npc">{group.npc}</span>
                    ) : null}
                    <span className="quest-name">
                      {group.kind === "vendor" ? `after ${group.quest}` : group.quest}
                    </span>
                  </div>
                  <ul className="gem-rows">
                    {group.gems.map((gem) => (
                      <li key={gem.name} className="gem-row">
                        <ColorPip color={gem.color} />
                        <span className="gem-name">{gem.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}

      {plan.unmatchedGems.length > 0 ? (
        <div className="unmatched">
          <h3>No campaign source</h3>
          <p className="muted">
            Drop-only / awakened / not in the gem database (no quest or vendor
            reward found for this class):
          </p>
          <ul>
            {plan.unmatchedGems.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

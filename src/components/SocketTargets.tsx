import type { SocketTarget } from "../lib/plan/buildPlan";
import { ColorPattern, ColorPip } from "./ColorPips";

export function SocketTargets({
  targets,
  gemsMissingFromSockets = [],
}: {
  targets: SocketTarget[];
  gemsMissingFromSockets?: string[];
}) {
  if (targets.length === 0) {
    return (
      <section className="panel">
        <h2>Socket targets</h2>
        <p className="muted">No socket groups found in this build.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Socket targets</h2>
      <p className="muted panel-lead">
        Target links from the PoB. Ready act is when every gem in the link can be
        obtained.
      </p>
      <ul className="socket-list">
        {targets.map((t) => (
          <li key={t.id} className={`socket-card${t.enabled ? "" : " socket-card-disabled"}`}>
            <div className="socket-card-header">
              <div>
                <div className="socket-title">
                  {t.label}
                  {!t.enabled ? (
                    <span className="badge badge-disabled">off</span>
                  ) : null}
                </div>
                <div className="socket-meta">
                  {t.slot} · {t.linkSize}L
                </div>
              </div>
              <ColorPattern colors={t.colors} />
            </div>
            <div className="socket-ready">
              {t.readyAct != null ? (
                <>Complete from Act {t.readyAct}</>
              ) : (
                <>Some gems unavailable in campaign vendors/rewards</>
              )}
            </div>
            <ul className="socket-gems">
              {t.gems.map((g) => (
                <li key={`${t.id}-${g.name}`}>
                  <ColorPip color={g.color} />
                  <span>{g.name}</span>
                  <span className="socket-gem-act">
                    {g.unavailable
                      ? "no source"
                      : g.availableAct != null
                        ? `Act ${g.availableAct}`
                        : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {gemsMissingFromSockets.length > 0 ? (
        <div className="unmatched">
          <h3>In checklist, not in a socket group</h3>
          <p className="muted">
            These gems are in the PoB skill set but weren’t attached to a socket
            group we could show:
          </p>
          <ul>
            {gemsMissingFromSockets.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

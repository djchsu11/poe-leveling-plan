import type { SocketColor } from "../lib/gems/types";

const LABELS: Record<SocketColor, string> = {
  R: "Strength",
  G: "Dexterity",
  B: "Intelligence",
  W: "White / unknown",
};

export function ColorPip({ color }: { color: SocketColor }) {
  return (
    <span
      className={`pip pip-${color.toLowerCase()}`}
      title={LABELS[color]}
      aria-label={LABELS[color]}
    />
  );
}

export function ColorPattern({ colors }: { colors: SocketColor[] }) {
  return (
    <span className="color-pattern" title={colors.join("-")}>
      {colors.map((c, i) => (
        <span key={`${c}-${i}`} className="color-pattern-item">
          <ColorPip color={c} />
          {i < colors.length - 1 ? <span className="link-dash">–</span> : null}
        </span>
      ))}
    </span>
  );
}

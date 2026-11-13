import { useCallback, useEffect, useMemo, useState } from "react";
import { ActPlan } from "./components/ActPlan";
import { ImportForm } from "./components/ImportForm";
import { SkillSetPicker } from "./components/SkillSetPicker";
import { SocketTargets } from "./components/SocketTargets";
import gemDb from "./data/gems.json";
import type { GemDatabase } from "./lib/gems/types";
import { planFromImportCode, type LevelingPlan } from "./lib/plan/buildPlan";
import "./App.css";

const STORAGE_KEY = "poe-leveling-plan:last-import";
const db = gemDb as GemDatabase;

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<LevelingPlan | null>(null);
  const [savedCode, setSavedCode] = useState("");

  const applyCode = useCallback((code: string, skillSetId?: string) => {
    const next = planFromImportCode(code, db, skillSetId);
    setPlan(next);
    setError(null);
    setSavedCode(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  useEffect(() => {
    const code = localStorage.getItem(STORAGE_KEY) ?? "";
    setSavedCode(code);
    if (!code.trim()) return;
    try {
      applyCode(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse saved import");
    }
  }, [applyCode]);

  const onSubmit = useCallback(
    (code: string) => {
      try {
        applyCode(code);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse import code");
        setPlan(null);
      }
    },
    [applyCode],
  );

  const onClear = useCallback(() => {
    setPlan(null);
    setError(null);
    setSavedCode("");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const onSkillSetChange = useCallback(
    (id: string) => {
      if (!savedCode.trim()) return;
      try {
        applyCode(savedCode, id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to switch skill set");
      }
    },
    [applyCode, savedCode],
  );

  const subtitle = useMemo(() => {
    if (!plan) return "Paste a PoB code for an act-by-act gem checklist.";
    const ascend = plan.ascendClassName ? ` ${plan.ascendClassName}` : "";
    const set = plan.skillSets.find((s) => s.id === plan.selectedSkillSetId);
    const setLabel = set ? ` · ${set.title}` : "";
    return `${plan.className}${ascend} · level ${plan.level}${setLabel}`;
  }, [plan]);

  return (
    <div className="app">
      <header className="hero">
        <div className="brand">PoE Leveling Plan</div>
        <p className="tagline">{subtitle}</p>
      </header>

      <ImportForm
        initialCode={savedCode}
        error={error}
        onSubmit={onSubmit}
        onClear={onClear}
      />

      {plan ? (
        <>
          <SkillSetPicker
            skillSets={plan.skillSets}
            selectedId={plan.selectedSkillSetId}
            preferredId={plan.preferredSkillSetId}
            onChange={onSkillSetChange}
          />
          <div className="layout">
            <ActPlan plan={plan} />
            <SocketTargets
              targets={plan.socketTargets}
              gemsMissingFromSockets={plan.gemsMissingFromSockets}
            />
          </div>
        </>
      ) : (
        <section className="panel empty-state">
          <p>
            Import a Path of Exile 1 Path of Building code to see which skill gems
            to pick up from quests and vendors in each act, plus the socket colors
            and links your build is aiming for.
          </p>
        </section>
      )}
    </div>
  );
}

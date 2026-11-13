import { useEffect, useState } from "react";

interface ImportFormProps {
  initialCode?: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (code: string) => void;
  onClear: () => void;
}

export function ImportForm({
  initialCode = "",
  busy = false,
  error,
  onSubmit,
  onClear,
}: ImportFormProps) {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  return (
    <form
      className="import-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(code);
      }}
    >
      <label htmlFor="pob-code" className="import-label">
        Path of Building import code
      </label>
      <textarea
        id="pob-code"
        className="import-input"
        rows={4}
        spellCheck={false}
        placeholder="Paste a PoE 1 PoB import code…"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className="import-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>
          Generate plan
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => {
            setCode("");
            onClear();
          }}
        >
          Clear
        </button>
      </div>
      {error ? <p className="import-error">{error}</p> : null}
    </form>
  );
}

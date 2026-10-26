import React, { useEffect } from "react";

// ¿DE QUE EMPRESA ES? (Nicolas, 2026-10-26: "siempre me debe preguntar si es de BGA, de De Raiz o ambas"). Se abre al
// cargar algo nuevo. "Ambas" lo deja compartido: lo ven las dos empresas. Esc cancela la carga.
export function ElegirEmpresa({
  titulo,
  opciones,
  sugerida,
  onElegir,
}: {
  titulo: string;
  opciones: Array<{ value: string; label: string; color?: string }>;
  // La empresa elegida arriba ("General" = todas): se marca como sugerida.
  sugerida?: string;
  onElegir: (empresa: string | null) => void;
}) {
  useEffect(() => {
    const alApretar = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onElegir(null);
    };
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, [onElegir]);
  const boton = (value: string, label: string, color?: string) => {
    const sugerido = value === sugerida;
    return (
      <button
        key={value}
        type="button"
        autoFocus={sugerido}
        onClick={() => onElegir(value)}
        style={{
          flex: "1 1 140px",
          padding: "14px 12px",
          borderRadius: 10,
          border: `2px solid ${sugerido ? color || "#0f172a" : "#e2e8f0"}`,
          background: sugerido ? "#f8fafc" : "#fff",
          fontSize: 15,
          fontWeight: 800,
          color: color || "#0f172a",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => onElegir(null)}
      style={{ position: "fixed", inset: 0, zIndex: 5200, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "12vh 16px" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(520px, 100%)", padding: 18, display: "grid", gap: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>¿De qué empresa es {titulo}?</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {opciones.map((o) => boton(o.value, o.label, o.color))}
          {opciones.length > 1 && boton("General", "Ambas (compartido)")}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          "Ambas" lo deja compartido: lo ven las dos empresas. Esc o click afuera: cancelar.
        </div>
      </div>
    </div>
  );
}

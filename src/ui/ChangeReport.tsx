import React, { useMemo, useState } from "react";
import type { SystemChangeRow } from "../domain/types";

// Reporte de cambios del sistema (nivel módulo): qué se modificó, quién y cuándo. Se abre solo al
// entrar (mostrando lo que pasó desde el último ingreso) y también se puede ver por hoy / semana / mes.
// Puramente presentacional: los datos y la carga viven en App.tsx.

type Range = "login" | "day" | "week" | "month";

const RANGES: Array<{ key: Range; label: string }> = [
  { key: "login", label: "Desde tu último ingreso" },
  { key: "day", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
];

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function ChangeReport({
  open,
  onClose,
  rows,
  userNames,
  currentUserId,
  lastSeenAt,
  onReload,
  primary,
}: {
  open: boolean;
  onClose: () => void;
  rows: SystemChangeRow[];
  userNames: Map<string, string>;
  currentUserId?: string;
  lastSeenAt: string | null;
  onReload: () => void;
  primary: string;
}) {
  const [range, setRange] = useState<Range>("login");

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      range === "login"
        ? lastSeenAt
          ? new Date(lastSeenAt).getTime()
          : 0
        : range === "day"
        ? now - 24 * 3600 * 1000
        : range === "week"
        ? now - 7 * 24 * 3600 * 1000
        : now - 30 * 24 * 3600 * 1000;
    return rows.filter((r) => new Date(r.created_at).getTime() > cutoff);
  }, [rows, range, lastSeenAt]);

  // Agrupado por módulo (lo que el usuario pidió: presupuestos, personal, stock, pagos, etc.).
  const grouped = useMemo(() => {
    const map = new Map<string, SystemChangeRow[]>();
    for (const r of filtered) {
      const label = r.module_label || r.module_key;
      const list = map.get(label);
      if (list) list.push(r);
      else map.set(label, [r]);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const distinctUsers = useMemo(
    () => new Set(filtered.filter((r) => r.user_id !== currentUserId).map((r) => r.user_id)).size,
    [filtered, currentUserId]
  );

  if (!open) return null;

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 16px",
    overflowY: "auto",
  };
  const card: React.CSSProperties = {
    background: "white",
    borderRadius: 18,
    width: "min(720px, 100%)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    overflow: "hidden",
  };
  const head: React.CSSProperties = {
    background: primary,
    color: "white",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  };
  const tab = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    background: active ? primary : "#e2e8f0",
    color: active ? "white" : "#334155",
  });

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Cambios en el sistema</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Qué modificó cada usuario (nivel módulo)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Cerrar
          </button>
        </div>

        <div style={{ padding: "14px 20px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {RANGES.map((r) => (
            <button key={r.key} type="button" style={tab(range === r.key)} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onReload}
            style={{ ...tab(false), marginLeft: "auto" }}
            title="Volver a leer los cambios"
          >
            ↻ Actualizar
          </button>
        </div>

        <div style={{ padding: "0 20px 8px 20px", color: "#64748b", fontSize: 13 }}>
          {filtered.length === 0
            ? "Sin cambios en este período."
            : `${filtered.length} cambio(s) · ${grouped.length} módulo(s)` +
              (distinctUsers > 0 ? ` · ${distinctUsers} otro(s) usuario(s)` : "")}
        </div>

        <div style={{ maxHeight: "56vh", overflowY: "auto", padding: "4px 20px 20px 20px" }}>
          {grouped.map(([label, list]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#0f172a",
                  borderBottom: "2px solid #e2e8f0",
                  paddingBottom: 4,
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{label}</span>
                <span style={{ color: "#94a3b8", fontWeight: 700 }}>{list.length}</span>
              </div>
              {list.slice(0, 40).map((r) => {
                const isMine = r.user_id === currentUserId;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "3px 0",
                      fontSize: 13,
                    }}
                  >
                    <span>
                      <strong style={{ color: isMine ? "#94a3b8" : "#0f172a" }}>
                        {userNames.get(r.user_id) || "Usuario"}
                        {isMine ? " (vos)" : ""}
                      </strong>
                      {r.company && r.company !== "General" ? (
                        <span style={{ color: "#94a3b8" }}> · {r.company}</span>
                      ) : null}
                    </span>
                    <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>{fmtWhen(r.created_at)}</span>
                  </div>
                );
              })}
              {list.length > 40 && (
                <div style={{ color: "#94a3b8", fontSize: 12 }}>… y {list.length - 40} más</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { ChangeReport };

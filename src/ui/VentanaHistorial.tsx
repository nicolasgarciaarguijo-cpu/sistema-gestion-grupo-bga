// HISTORIAL DE CAMBIOS (Nicolas, 21/11/2026): quien cambio que dato y cuando. Solo lectura: se consulta, no se
// edita. Los datos salen de la tabla `registro_cambios` (lib/registroCambios.ts).
import React, { useEffect, useState } from "react";
import { cambioLegible, queEs } from "../domain/historialCambios";
import type { FilaHistorial } from "../lib/registroCambios";

const ACCION: Record<string, { texto: string; color: string }> = {
  alta: { texto: "cargó", color: "#166534" },
  cambio: { texto: "cambió", color: "#1d4ed8" },
  baja: { texto: "borró", color: "#b91c1c" },
};
const cuando = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 700 };

export function VentanaHistorial({
  leer,
  empresaCorta,
  onCerrar,
}: {
  leer: (texto: string) => Promise<FilaHistorial[]>;
  empresaCorta: (company: string) => string;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [buscado, setBuscado] = useState("");
  const [filas, setFilas] = useState<FilaHistorial[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    setFilas(null);
    setError("");
    leer(buscado)
      .then((f) => vivo && setFilas(f))
      .catch((e) => vivo && setError(e?.message || String(e)));
    return () => {
      vivo = false;
    };
  }, [buscado, leer]);

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4800, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }}>
      <div data-historial onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16, width: "min(980px, 100%)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <strong style={{ fontSize: 16 }}>Historial de cambios</strong>
          <span style={{ fontSize: 12, color: "#64748b" }}>Quién cargó, cambió o borró cada dato. Los últimos 200.</span>
          <button type="button" style={{ ...btn, marginLeft: "auto" }} onClick={onCerrar}>Cerrar</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBuscado(texto);
          }}
          style={{ display: "flex", gap: 8, marginBottom: 10 }}
        >
          <input
            data-buscar-historial
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por cliente, proveedor, monto o persona…"
            style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
          />
          <button type="submit" style={btn}>Buscar</button>
        </form>
        {error && <div style={{ color: "#b91c1c", fontSize: 12.5 }}>No se pudo leer el historial: {error}</div>}
        {!error && filas === null && <div style={{ fontSize: 13, color: "#64748b" }}>Leyendo…</div>}
        {filas && filas.length === 0 && (
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {buscado ? "No hay cambios que coincidan con la búsqueda." : "Todavía no hay cambios anotados. El historial empezó a guardarse el 21/11/2026: lo anterior no está."}
          </div>
        )}
        {filas && filas.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            {filas.map((f) => (
              <div key={f.id} data-fila-historial={f.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 12.5 }}>
                <div>
                  <span style={{ color: "#64748b" }}>{cuando(f.creado_en)}</span> · <b>{f.usuario || "—"}</b>{" "}
                  <b style={{ color: (ACCION[f.accion] || ACCION.cambio).color }}>{(ACCION[f.accion] || ACCION.cambio).texto}</b> · {queEs(f)}
                  {f.company ? <span style={{ color: "#64748b" }}> · {empresaCorta(f.company)}</span> : null}
                </div>
                <div style={{ fontWeight: 600 }}>{f.resumen}</div>
                {(f.cambios || []).length > 0 && (
                  <div style={{ color: "#334155", marginTop: 2 }}>
                    {f.cambios.map(cambioLegible).map((c, i) => (
                      <div key={i}>
                        <span style={{ color: "#64748b" }}>{c.campo}:</span> <span style={{ textDecoration: "line-through", color: "#94a3b8" }}>{c.antes || "(vacío)"}</span> → <b>{c.despues || "(vacío)"}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

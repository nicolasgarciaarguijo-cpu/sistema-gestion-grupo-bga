// ACCESO · ESTRUCTURA DEL CALENDARIO ANUAL (Nicolas, 31/10/2026: "los listados de todo el sistema los quiero poder editar").
// El Calendario es de solo lectura (se carga en cada solapa), asi que su estructura se edita aca: como se llaman las secciones y
// los renglones, en que orden van, cuales no se muestran y los renglones y secciones propios. La clave interna de cada uno no
// cambia (es lo que vincula las solapas) y nada con plata se esconde: solo se oculta o borra lo que no tiene movimientos.
import React, { useState } from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import { extraRowsOf, esSeccionPropia, sectionKeyFromLabel, seccionesBase, type CalSection, type CalendarRowConfig } from "../domain/calendarStructure";

const th: React.CSSProperties = { padding: "4px 6px", textAlign: "left", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "3px 6px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13, width: "100%", boxSizing: "border-box" };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 12, cursor: "pointer" };

const moverEn = (lista: string[], key: string, d: -1 | 1) => {
  const i = lista.indexOf(key);
  const j = i + d;
  if (i < 0 || j < 0 || j >= lista.length) return lista;
  const out = [...lista];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

export function EstructuraCalendario({
  config,
  onCambiar,
  movimientos,
}: {
  config: CalendarRowConfig;
  onCambiar: (c: CalendarRowConfig) => void;
  // Cuantos movimientos tiene cada renglon (por su clave, o "custom:<seccion>:<nombre>") y cada seccion (por su clave).
  movimientos: Record<string, number>;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nuevaSeccion, setNuevaSeccion] = useState({ nombre: "", dir: "out" as "in" | "out" });
  const [nuevoRenglon, setNuevoRenglon] = useState("");
  const [aviso, setAviso] = useState("");
  const guardar = (cambio: Partial<CalendarRowConfig>) => onCambiar({ ...config, ...cambio });
  const base = seccionesBase(config);
  const ocultas = new Set(config.hiddenSections || []);
  const ordenGrupo = (dir: "in" | "out") => {
    const delGrupo = base.filter((s) => s.dir === dir).map((s) => s.key);
    const orden = config.sectionOrder || [];
    return [...delGrupo].sort((a, b) => {
      const pa = orden.indexOf(a);
      const pb = orden.indexOf(b);
      return (pa < 0 ? 1e9 : pa) - (pb < 0 ? 1e9 : pb) || delGrupo.indexOf(a) - delGrupo.indexOf(b);
    });
  };
  const moverSeccion = (s: CalSection, d: -1 | 1) => {
    const nuevo = moverEn(ordenGrupo(s.dir), s.key, d);
    const otro = ordenGrupo(s.dir === "in" ? "out" : "in");
    guardar({ sectionOrder: s.dir === "in" ? [...nuevo, ...otro] : [...otro, ...nuevo] });
  };
  const movs = (key: string) => movimientos[key] || 0;
  const filasDe = (s: CalSection) => {
    const orden = config.rowOrder?.[s.key] || [];
    const keys = s.items.map((it) => it.key);
    return [...keys].sort((a, b) => {
      const pa = orden.indexOf(a);
      const pb = orden.indexOf(b);
      return (pa < 0 ? 1e9 : pa) - (pb < 0 ? 1e9 : pb) || keys.indexOf(a) - keys.indexOf(b);
    });
  };

  const seccion = (s: CalSection, i: number, total: number) => {
    const oculta = ocultas.has(s.key);
    const propia = esSeccionPropia(s.key);
    const extras = extraRowsOf(config, s.key);
    const filas = filasDe(s);
    const enUso = movs(s.key);
    const abiertaEsta = abierta === s.key;
    return (
      <React.Fragment key={s.key}>
        <tr style={{ opacity: oculta ? 0.5 : 1, background: abiertaEsta ? "#f0fdfa" : undefined }}>
          <td style={td}>
            <input
              style={{ ...input, fontWeight: 700 }}
              placeholder={s.label}
              value={propia ? s.label : config.sectionLabels?.[s.key] || ""}
              onChange={(e) =>
                propia
                  ? guardar({ sections: (config.sections || []).map((x) => (x.key === s.key ? { ...x, label: e.target.value || x.label } : x)) })
                  : guardar({ sectionLabels: { ...(config.sectionLabels || {}), [s.key]: e.target.value } })
              }
              title={propia ? "Sección propia" : `Nombre de siempre: ${s.label} (vacío = vuelve a ese)`}
            />
          </td>
          <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{s.dynamic ? (s.dynamic === "cobranzas" ? "por trabajo (solos)" : "por proveedor (solos)") : `${filas.length + extras.length} renglones`}</td>
          <td style={{ ...td, textAlign: "right", color: enUso ? "#0f172a" : "#94a3b8" }}>{enUso}</td>
          <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
            <button type="button" style={btn} disabled={i === 0} onClick={() => moverSeccion(s, -1)} title="Subir">↑</button>{" "}
            <button type="button" style={btn} disabled={i === total - 1} onClick={() => moverSeccion(s, 1)} title="Bajar">↓</button>{" "}
            {!s.dynamic && <button type="button" style={btn} onClick={() => { setAbierta(abiertaEsta ? null : s.key); setAviso(""); }}>{abiertaEsta ? "Cerrar" : "Renglones"}</button>}{" "}
            {!s.dynamic && (
              <button
                type="button"
                style={btn}
                onClick={() => {
                  if (!oculta && enUso > 0) return setAviso(`"${s.label}" tiene ${enUso} movimientos: no se oculta (nunca se esconde plata).`);
                  setAviso("");
                  guardar({ hiddenSections: oculta ? (config.hiddenSections || []).filter((k) => k !== s.key) : [...(config.hiddenSections || []), s.key] });
                }}
              >
                {oculta ? "Mostrar" : "Ocultar"}
              </button>
            )}{" "}
            {propia && (
              <button
                type="button"
                style={{ ...btn, color: "#b91c1c" }}
                onClick={() => {
                  if (enUso > 0 || extras.length) return setAviso(`"${s.label}" tiene renglones o movimientos: primero sacalos.`);
                  if (!window.confirm(`¿Borrar la sección "${s.label}"?`)) return;
                  guardar({ sections: (config.sections || []).filter((x) => x.key !== s.key) });
                }}
              >
                🗑
              </button>
            )}
          </td>
        </tr>
        {abiertaEsta && (
          <tr>
            <td colSpan={4} style={{ ...td, background: "#f8fafc", padding: "8px 12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {filas.map((key, j) => {
                    const it = s.items.find((x) => x.key === key)!;
                    const oculto = (config.hidden || []).includes(key);
                    return (
                      <tr key={key} style={{ opacity: oculto ? 0.5 : 1 }}>
                        <td style={td}>
                          <input style={input} placeholder={it.label} value={config.labels?.[key] || ""} title={`Nombre de siempre: ${it.label} (vacío = vuelve a ese)`} onChange={(e) => guardar({ labels: { ...(config.labels || {}), [key]: e.target.value } })} />
                        </td>
                        <td style={{ ...td, textAlign: "right", width: 60, color: movs(key) ? "#0f172a" : "#94a3b8" }}>{movs(key)}</td>
                        <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right", width: 220 }}>
                          <button type="button" style={btn} disabled={j === 0} onClick={() => guardar({ rowOrder: { ...(config.rowOrder || {}), [s.key]: moverEn(filas, key, -1) } })}>↑</button>{" "}
                          <button type="button" style={btn} disabled={j === filas.length - 1} onClick={() => guardar({ rowOrder: { ...(config.rowOrder || {}), [s.key]: moverEn(filas, key, 1) } })}>↓</button>{" "}
                          <button
                            type="button"
                            style={btn}
                            onClick={() => {
                              if (!oculto && movs(key) > 0) return setAviso(`"${config.labels?.[key] || it.label}" tiene movimientos: no se oculta.`);
                              setAviso("");
                              guardar({ hidden: oculto ? (config.hidden || []).filter((k) => k !== key) : [...(config.hidden || []), key] });
                            }}
                          >
                            {oculto ? "Mostrar" : "Ocultar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {extras.map((label) => {
                    const key = `custom:${s.key}:${label}`;
                    return (
                      <tr key={key}>
                        <td style={td}>
                          {label} <span style={{ fontSize: 11, color: "#7c3aed" }}>propio</span>
                        </td>
                        <td style={{ ...td, textAlign: "right", width: 60, color: movs(key) ? "#0f172a" : "#94a3b8" }}>{movs(key)}</td>
                        <td style={{ ...td, textAlign: "right", width: 220 }}>
                          <button
                            type="button"
                            style={{ ...btn, color: "#b91c1c" }}
                            onClick={() => {
                              if (movs(key) > 0) return setAviso(`"${label}" tiene movimientos: no se borra.`);
                              if (!window.confirm(`¿Borrar el renglón "${label}"?`)) return;
                              guardar({ extra: (config.extra || []).filter((r) => !(r.sectionKey === s.key && r.label === label)) });
                            }}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input style={{ ...input, maxWidth: 280 }} placeholder="Renglón propio nuevo" value={nuevoRenglon} onChange={(e) => setNuevoRenglon(e.target.value)} />
                <ButtonLike
                  secondary
                  disabled={!nuevoRenglon.trim()}
                  onClick={() => {
                    const n = nuevoRenglon.trim();
                    if (extras.some((x) => x.toLowerCase() === n.toLowerCase())) return setAviso(`Ya hay un renglón "${n}" en esta sección.`);
                    guardar({ extra: [...(config.extra || []), { sectionKey: s.key, label: n }] });
                    setNuevoRenglon("");
                  }}
                >
                  + Renglón
                </ButtonLike>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const grupo = (dir: "in" | "out") => {
    const keys = ordenGrupo(dir);
    return keys.map((k, i) => seccion(base.find((s) => s.key === k)!, i, keys.length));
  };

  return (
    <Panel span="full" title="Estructura del Calendario anual">
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Cómo se llaman las secciones y los renglones del Calendario, en qué orden van, cuáles no se muestran y los renglones y secciones propios. Lo que
        vincula cada renglón con su solapa no cambia, así que renombrar u ordenar no mueve plata. Solo se oculta o borra lo que no tiene movimientos (y si a
        algo oculto le llega plata, vuelve a verse). Nombre vacío = el de siempre.
      </div>
      {aviso && <div style={{ fontSize: 12.5, color: "#b91c1c", marginBottom: 6 }}>⚠ {aviso}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Sección</th>
            <th style={th}>Renglones</th>
            <th style={{ ...th, textAlign: "right" }}>Movimientos</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={4} style={{ ...td, fontSize: 11, fontWeight: 800, color: "#166534", background: "#f0fdf4" }}>INGRESOS</td></tr>
          {grupo("in")}
          <tr><td colSpan={4} style={{ ...td, fontSize: 11, fontWeight: 800, color: "#991b1b", background: "#fef2f2" }}>EGRESOS</td></tr>
          {grupo("out")}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 280 }} placeholder="Sección propia nueva" value={nuevaSeccion.nombre} onChange={(e) => setNuevaSeccion({ ...nuevaSeccion, nombre: e.target.value })} />
        <select style={{ ...input, width: "auto" }} value={nuevaSeccion.dir} onChange={(e) => setNuevaSeccion({ ...nuevaSeccion, dir: e.target.value as "in" | "out" })}>
          <option value="in">Ingreso</option>
          <option value="out">Egreso</option>
        </select>
        <ButtonLike
          disabled={!nuevaSeccion.nombre.trim()}
          onClick={() => {
            const key = sectionKeyFromLabel(nuevaSeccion.nombre);
            if (key === "propia:") return setAviso("Ponele un nombre con letras o números.");
            if (base.some((s) => s.key === key)) return setAviso(`Ya hay una sección "${nuevaSeccion.nombre}".`);
            guardar({ sections: [...(config.sections || []), { key, label: nuevaSeccion.nombre.trim(), dir: nuevaSeccion.dir }] });
            setNuevaSeccion({ nombre: "", dir: nuevaSeccion.dir });
            setAviso("");
          }}
        >
          + Sección
        </ButtonLike>
      </div>
    </Panel>
  );
}

// LEER LA PLANILLA DE PRECIOS DEL STOCK (Nicolas, 21/11/2026). El boton lee la planilla vinculada y muestra que
// cambiaria; recien al apretar "Actualizar" se tocan los precios. Reglas en domain/planillaStock.ts.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { compararPlanilla, leerPlanilla, tildadosPorDefecto, type ArticuloConPrecio, type CambioDePrecio, type ComparacionPlanilla, type ReferenciaMasBarato } from "../domain/planillaStock";
import { anotarLectura, archivoDe, desvincularPlanilla, elegirPlanilla, hojasDelExcel, planillaVinculada, sePuedeVincular, ultimaLectura, type UltimaLectura } from "../lib/planillaVinculada";

const plata = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 700 };
const celda: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #e2e8f0", fontSize: 12.5, textAlign: "left", verticalAlign: "top" };
const num: React.CSSProperties = { ...celda, textAlign: "right", whiteSpace: "nowrap" };

function Tabla({ titulo, color, filas, tildados, alTildar, alTildarTodos, nota }: { titulo: string; color: string; filas: CambioDePrecio[]; tildados: Set<number>; alTildar: (id: number) => void; alTildarTodos: (ids: number[], poner: boolean) => void; nota?: string }) {
  if (filas.length === 0) return null;
  const todos = filas.every((f) => tildados.has(f.id));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color, fontSize: 13.5 }}>{titulo} ({filas.length})</strong>
        {nota && <span style={{ fontSize: 12, color: "#64748b" }}>{nota}</span>}
        <button type="button" style={{ ...btn, padding: "2px 8px", marginLeft: "auto" }} onClick={() => alTildarTodos(filas.map((f) => f.id), !todos)}>
          {todos ? "Destildar todos" : "Tildar todos"}
        </button>
      </div>
      <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 4 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={celda} />
              <th style={celda}>Código</th>
              <th style={celda}>Artículo</th>
              <th style={num}>Hoy</th>
              <th style={num}>Planilla</th>
              <th style={num}>%</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} data-cambio-precio={f.codigo}>
                <td style={celda}>
                  <input type="checkbox" checked={tildados.has(f.id)} onChange={() => alTildar(f.id)} />
                </td>
                <td style={{ ...celda, whiteSpace: "nowrap", fontWeight: 700 }}>{f.codigo}</td>
                <td style={celda}>
                  {f.descripcion || "—"}
                  {f.descripcionDistinta && (
                    <div style={{ color: "#b45309", fontSize: 11.5 }}>⚠ en la planilla este código dice «{f.descripcionPlanilla}»: revisá que sea el mismo artículo</div>
                  )}
                </td>
                <td style={num}>{plata(f.antes)}</td>
                <td style={{ ...num, fontWeight: 700 }}>{plata(f.despues)}</td>
                <td style={{ ...num, color }}>{f.pct == null ? "—" : `${f.pct > 0 ? "+" : ""}${f.pct.toLocaleString("es-AR")}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VentanaPlanillaStock({
  nombre,
  comparacion,
  hojasLeidas,
  onAplicar,
  onCerrar,
  onCambiarPlanilla,
  onReferencias,
}: {
  nombre: string;
  comparacion: ComparacionPlanilla;
  hojasLeidas: string[];
  onReferencias?: (referencias: ReferenciaMasBarato[]) => void;
  onAplicar: (cambios: Array<{ id: number; despues: number }>) => void;
  onCerrar: () => void;
  onCambiarPlanilla?: () => void;
}) {
  const [tildados, setTildados] = useState<Set<number>>(() => new Set(tildadosPorDefecto(comparacion)));
  const [verNo, setVerNo] = useState(false);
  const [anotadas, setAnotadas] = useState(0);
  const referencias = comparacion.referencias || [];
  const alTildar = (id: number) =>
    setTildados((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  const alTildarTodos = (ids: number[], poner: boolean) =>
    setTildados((prev) => {
      const s = new Set(prev);
      ids.forEach((id) => (poner ? s.add(id) : s.delete(id)));
      return s;
    });
  const elegidos = useMemo(() => [...comparacion.suben, ...comparacion.bajan].filter((c) => tildados.has(c.id)), [comparacion, tildados]);
  const bajasElegidas = comparacion.bajan.filter((c) => tildados.has(c.id)).length;
  const nada = comparacion.suben.length === 0 && comparacion.bajan.length === 0;

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4800, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }}>
      <div data-planilla-stock onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16, width: "min(900px, 100%)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 16 }}>Precios de la planilla</strong>
          <button type="button" style={{ ...btn, marginLeft: "auto" }} onClick={onCerrar}>Cerrar sin cambiar nada</button>
        </div>
        <div style={{ fontSize: 12.5, color: "#475569", marginTop: 4 }}>
          <b>{nombre}</b> · hojas leídas: {hojasLeidas.join(", ") || "ninguna"}
          {onCambiarPlanilla && (
            <>
              {" · "}
              <button type="button" onClick={onCambiarPlanilla} style={{ border: 0, background: "none", color: "#1d4ed8", cursor: "pointer", padding: 0, fontSize: 12.5, textDecoration: "underline" }}>
                vincular otra planilla
              </button>
            </>
          )}
        </div>
        <div data-resumen-planilla style={{ marginTop: 10, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
          {hojasLeidas.length === 0
            ? "No encontré ninguna hoja con una columna «Código» y una de precio («Costo neto»). ¿Es la planilla de costos?"
            : nada
            ? `Venimos bien: los ${comparacion.iguales} precios de la planilla son los mismos que tiene el sistema. No hay nada que actualizar.`
            : `${comparacion.suben.length} suben · ${comparacion.bajan.length} bajan · ${comparacion.iguales} quedan igual. Todavía no se cambió nada: se actualiza lo que quede tildado.`}
          {comparacion.faltanEnPlanilla > 0 && hojasLeidas.length > 0 && (
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{comparacion.faltanEnPlanilla} artículos del sistema no figuran en la planilla: quedan como están.</div>
          )}
        </div>

        {onReferencias && referencias.length > 0 && (
          <div data-referencias-planilla style={{ marginTop: 10, padding: "8px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>
              La planilla trae <b>{referencias.length}</b> referencia{referencias.length === 1 ? "" : "s"} de «más barato» (precio y proveedor). Son solo para saber dónde conviene comprar: <b>no cambian el precio con que se cotiza</b>.
            </span>
            {anotadas > 0 ? (
              <span style={{ marginLeft: "auto", color: "#166534", fontWeight: 700 }}>✓ {anotadas} anotada{anotadas === 1 ? "" : "s"}</span>
            ) : (
              <button
                type="button"
                data-anotar-referencias
                style={{ ...btn, marginLeft: "auto" }}
                onClick={() => {
                  onReferencias(referencias);
                  setAnotadas(referencias.length);
                }}
              >
                Anotar las referencias
              </button>
            )}
          </div>
        )}

        <Tabla titulo="Suben" color="#166534" filas={comparacion.suben} tildados={tildados} alTildar={alTildar} alTildarTodos={alTildarTodos} />
        <Tabla
          titulo="Bajan"
          color="#b91c1c"
          filas={comparacion.bajan}
          tildados={tildados}
          alTildar={alTildar}
          alTildarTodos={alTildarTodos}
          nota="Un precio no debería bajar: no vienen tildados. Revisalos y tildá solo los que sean correctos."
        />

        {comparacion.noAplicables.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12.5 }}>
            <button type="button" style={{ ...btn, padding: "2px 8px" }} onClick={() => setVerNo((v) => !v)}>
              {verNo ? "Ocultar" : "Ver"} los {comparacion.noAplicables.length} renglones de la planilla que no se pueden aplicar
            </button>
            {verNo && (
              <div data-no-aplicables style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 4, padding: "4px 8px" }}>
                {comparacion.noAplicables.map((n) => (
                  <div key={`${n.hoja}-${n.codigo}`}>
                    <b>{n.codigo}</b> {n.descripcion} <span style={{ color: "#64748b" }}>({n.hoja})</span> — <span style={{ color: "#b45309" }}>{n.motivo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!nada && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {bajasElegidas > 0 && <span style={{ color: "#b91c1c", fontSize: 12.5, fontWeight: 700 }}>⚠ Vas a bajar {bajasElegidas} precio{bajasElegidas === 1 ? "" : "s"}.</span>}
            <button
              type="button"
              data-aplicar-planilla
              disabled={elegidos.length === 0}
              onClick={() => onAplicar(elegidos.map((c) => ({ id: c.id, despues: c.despues })))}
              style={{ ...btn, marginLeft: "auto", background: elegidos.length ? "#16a34a" : "#e2e8f0", color: elegidos.length ? "#fff" : "#64748b", borderColor: "transparent", padding: "8px 16px", cursor: elegidos.length ? "pointer" : "default" }}
            >
              {elegidos.length === 0 ? "Nada tildado" : `Actualizar ${elegidos.length} precio${elegidos.length === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const fechaCorta = (ms: number | string) => {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** El boton de la solapa Stock: lee la planilla vinculada (o pide elegirla) y abre la ventana con los cambios. */
export function BotonPlanillaStock({ articulos, onAplicar, onReferencias }: { articulos: ArticuloConPrecio[]; onReferencias?: (referencias: ReferenciaMasBarato[]) => void; onAplicar: (cambios: Array<{ id: number; despues: number }>) => void }) {
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState("");
  const [vista, setVista] = useState<null | { nombre: string; modificado: number; comparacion: ComparacionPlanilla; hojasLeidas: string[] }>(null);
  const [ultima, setUltima] = useState<UltimaLectura | null>(() => ultimaLectura());
  const [cambio, setCambio] = useState(false);
  const [hecho, setHecho] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Al abrir Stock: si la planilla vinculada cambio despues de la ultima lectura, se avisa (sin leer nada solo).
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!sePuedeVincular()) return;
      const file = await archivoDe(await planillaVinculada(), false).catch(() => null);
      const u = ultimaLectura();
      if (vivo && file && (!u || file.lastModified > u.modificado)) setCambio(true);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const leerArchivo = async (file: File) => {
    const hojas = await hojasDelExcel(file);
    const leida = leerPlanilla(hojas);
    setVista({ nombre: file.name, modificado: file.lastModified, comparacion: compararPlanilla(leida.filas, articulos), hojasLeidas: leida.hojasLeidas });
  };

  const leer = async (elegirOtra = false) => {
    setError("");
    setHecho("");
    if (!sePuedeVincular()) {
      inputRef.current?.click();
      return;
    }
    setLeyendo(true);
    try {
      let handle = elegirOtra ? null : await planillaVinculada();
      let file = handle ? await archivoDe(handle, true).catch(() => null) : null;
      if (!file) {
        handle = await elegirPlanilla();
        file = await archivoDe(handle, true);
      }
      if (!file) throw new Error("No se dio permiso para leer la planilla.");
      await leerArchivo(file);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || String(e));
    } finally {
      setLeyendo(false);
    }
  };

  const cerrar = (aplicados: number) => {
    if (vista) {
      const l = { nombre: vista.nombre, modificado: vista.modificado, leidaEl: new Date().toISOString(), aplicados };
      anotarLectura(l);
      setUltima(l);
      setCambio(false);
    }
    setVista(null);
  };

  return (
    <>
      <button
        type="button"
        data-leer-planilla-stock
        onClick={() => leer()}
        disabled={leyendo}
        title={ultima ? `Planilla vinculada: ${ultima.nombre}. Última lectura: ${fechaCorta(ultima.leidaEl)}.` : "Elegí la planilla de costos: queda vinculada y la próxima vez se lee sola."}
        style={{ ...btn, background: cambio ? "#fef3c7" : "#fff", borderColor: cambio ? "#f59e0b" : "#cbd5e1" }}
      >
        {leyendo ? "Leyendo la planilla…" : cambio ? "📊 La planilla cambió · leer precios" : "📊 Leer planilla y actualizar precios"}
      </button>
      {ultima && !cambio && <span style={{ fontSize: 11.5, color: "#64748b" }}>leída {fechaCorta(ultima.leidaEl)}</span>}
      {hecho && <span data-planilla-hecho style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>{hecho}</span>}
      {error && <span style={{ fontSize: 12, color: "#b91c1c" }}>No se pudo leer la planilla: {error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setLeyendo(true);
          try {
            await leerArchivo(file);
          } catch (err: any) {
            setError(err?.message || String(err));
          } finally {
            setLeyendo(false);
          }
        }}
      />
      {vista && (
        <VentanaPlanillaStock
          nombre={vista.nombre}
          comparacion={vista.comparacion}
          hojasLeidas={vista.hojasLeidas}
          onCerrar={() => cerrar(0)}
          onReferencias={onReferencias}
          onCambiarPlanilla={
            sePuedeVincular()
              ? async () => {
                  setVista(null);
                  await desvincularPlanilla().catch(() => null);
                  leer(true);
                }
              : undefined
          }
          onAplicar={(cambios) => {
            onAplicar(cambios);
            setHecho(`${cambios.length} precio${cambios.length === 1 ? "" : "s"} actualizado${cambios.length === 1 ? "" : "s"}`);
            cerrar(cambios.length);
          }}
        />
      )}
    </>
  );
}

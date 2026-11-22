// SINCRONIZAR CANTIDADES Y UBICACION CON LA PLANILLA (Nicolas, 22/11/2026): "el control de stock lo quiero en ambas
// opciones, hay quienes no usan el sistema pero si podrian corregir la planilla". Reglas en domain/planillaCantidades.
// Abrir la ventana no cambia nada: recien "Sincronizar" trae los recuentos elegidos y escribe la planilla.
import React, { useMemo, useRef, useState } from "react";
import {
  aplicarRecuentos,
  compararCantidades,
  leerCantidades,
  planDeEscritura,
  type ArticuloParaPlanilla,
  type CambioDeCantidad,
  type ComparacionCantidades,
} from "../domain/planillaCantidades";
import type { HojaPlanilla } from "../domain/planillaStock";
import { abrirLibro, archivoDe, descargarPlanilla, elegirPlanilla, escribirPlan, guardarEnPlanilla, planillaVinculada, sePuedeVincular } from "../lib/planillaVinculada";

const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 700 };
const celda: React.CSSProperties = { padding: "4px 8px", borderBottom: "1px solid #e2e8f0", fontSize: 12.5, textAlign: "left", verticalAlign: "top" };
const num: React.CSSProperties = { ...celda, textAlign: "right", whiteSpace: "nowrap" };
const n = (v: number | null) => (v == null ? "—" : v.toLocaleString("es-AR", { maximumFractionDigits: 3 }));

export type Decision = "planilla" | "sistema" | "despues";
const OPCIONES: Array<{ valor: Decision; texto: string }> = [
  { valor: "planilla", texto: "Vale la planilla" },
  { valor: "sistema", texto: "Vale el sistema" },
  { valor: "despues", texto: "Después" },
];

function Tabla({ titulo, color, nota, filas, decisiones, alDecidir }: { titulo: string; color: string; nota: string; filas: CambioDeCantidad[]; decisiones: Record<number, Decision>; alDecidir: (ids: number[], d: Decision) => void }) {
  if (filas.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color, fontSize: 13.5 }}>{titulo} ({filas.length})</strong>
        <span style={{ fontSize: 12, color: "#64748b" }}>{nota}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {OPCIONES.map((o) => (
            <button key={o.valor} type="button" style={{ ...btn, padding: "2px 8px", fontWeight: 600 }} onClick={() => alDecidir(filas.map((f) => f.id), o.valor)}>
              Todos: {o.texto.toLowerCase()}
            </button>
          ))}
        </span>
      </div>
      <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 4 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={celda}>Código</th>
              <th style={celda}>Artículo</th>
              <th style={num}>Última vez</th>
              <th style={num}>Sistema</th>
              <th style={num}>Planilla</th>
              <th style={num}>Diferencia</th>
              <th style={celda}>Qué vale</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} data-cambio-cantidad={f.codigo}>
                <td style={{ ...celda, whiteSpace: "nowrap", fontWeight: 700 }}>{f.codigo}</td>
                <td style={celda}>
                  {f.descripcion || "—"} <span style={{ color: "#94a3b8" }}>{f.unidad}</span>
                </td>
                <td style={{ ...num, color: "#64748b" }}>{n(f.base)}</td>
                <td style={num}>{n(f.enSistema)}</td>
                <td style={{ ...num, fontWeight: 700 }}>{n(f.enPlanilla)}</td>
                <td style={{ ...num, color: f.diferencia > 0 ? "#166534" : "#b91c1c" }}>{f.diferencia > 0 ? "+" : ""}{n(f.diferencia)}</td>
                <td style={{ ...celda, whiteSpace: "nowrap" }}>
                  {OPCIONES.map((o) => {
                    const activa = (decisiones[f.id] || "despues") === o.valor;
                    return (
                      <button
                        key={o.valor}
                        type="button"
                        data-decision={o.valor}
                        aria-pressed={activa}
                        onClick={() => alDecidir([f.id], o.valor)}
                        style={{ ...btn, padding: "2px 7px", marginRight: 3, fontWeight: activa ? 800 : 500, background: activa ? "#1d4ed8" : "#fff", color: activa ? "#fff" : "#334155", borderColor: activa ? "#1d4ed8" : "#cbd5e1" }}
                      >
                        {o.texto}
                      </button>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Vista = { nombre: string; libro: any; handle: any | null; hojas: HojaPlanilla[]; comparacion: ComparacionCantidades; hojasLeidas: string[] };

export function decisionesPorDefecto(c: ComparacionCantidades): Record<number, Decision> {
  const d: Record<number, Decision> = {};
  c.recuentos.forEach((x) => (d[x.id] = "planilla"));
  return d;
}

export function VentanaCantidades({ vista, articulos, guardando, error, onSincronizar, onCerrar }: { vista: Vista; articulos: ArticuloParaPlanilla[]; guardando: boolean; error: string; onSincronizar: (decisiones: Record<number, Decision>) => void; onCerrar: () => void }) {
  const { comparacion } = vista;
  const [decisiones, setDecisiones] = useState<Record<number, Decision>>(() => decisionesPorDefecto(comparacion));
  const [verNo, setVerNo] = useState(false);
  const alDecidir = (ids: number[], d: Decision) => setDecisiones((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, d])) }));
  const todos = useMemo(() => [...comparacion.recuentos, ...comparacion.choques, ...comparacion.sinReferencia], [comparacion]);
  // Lo que se va a escribir con las decisiones de ahora (mismo calculo que al sincronizar).
  const plan = useMemo(() => {
    const valePlanilla = todos.filter((c) => decisiones[c.id] === "planilla").map((c) => ({ id: c.id, enPlanilla: c.enPlanilla }));
    const sistemaGana = new Set(todos.filter((c) => decisiones[c.id] === "sistema").map((c) => c.id));
    const despues = aplicarRecuentos(articulos as any[], valePlanilla, "", () => 0) as ArticuloParaPlanilla[];
    return { traer: valePlanilla.length, escritura: planDeEscritura(vista.hojas, despues, sistemaGana) };
  }, [articulos, decisiones, todos, vista.hojas]);
  const r = plan.escritura.resumen;
  const nada = plan.traer === 0 && plan.escritura.celdas.length === 0;

  return (
    <div onClick={guardando ? undefined : onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4800, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }}>
      <div data-planilla-cantidades onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16, width: "min(1000px, 100%)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 16 }}>Cantidades y ubicación: sistema ↔ planilla</strong>
          <button type="button" style={{ ...btn, marginLeft: "auto" }} disabled={guardando} onClick={onCerrar}>Cerrar sin cambiar nada</button>
        </div>
        <div style={{ fontSize: 12.5, color: "#475569", marginTop: 4 }}>
          <b>{vista.nombre}</b> · hojas con cantidad: {vista.hojasLeidas.join(", ") || "ninguna todavía (se agregan las columnas al sincronizar)"}
        </div>
        <div data-resumen-cantidades style={{ marginTop: 10, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
          {todos.length === 0
            ? `Nadie corrigió cantidades en la planilla (${comparacion.iguales} coinciden con el sistema).`
            : `${comparacion.recuentos.length} corregidas en la planilla · ${comparacion.choques.length} cambiaron de los dos lados · ${comparacion.sinReferencia.length} sin referencia · ${comparacion.iguales} coinciden.`}
          <div data-plan-escritura style={{ marginTop: 4 }}>
            {nada ? (
              "Venimos bien: la planilla y el sistema dicen lo mismo. No hay nada que sincronizar."
            ) : (
              <>
                Al sincronizar: <b>entran al sistema {plan.traer}</b> recuento{plan.traer === 1 ? "" : "s"} (quedan como movimiento del artículo) y <b>en la planilla se escriben</b>{" "}
                la cantidad de {r.cantidades} artículo{r.cantidades === 1 ? "" : "s"}, {r.ubicaciones} ubicaci{r.ubicaciones === 1 ? "ón" : "ones"} y {r.altas} artículo{r.altas === 1 ? "" : "s"} que no estaba{r.altas === 1 ? "" : "n"}
                {plan.escritura.hojasNuevas.length > 0 && <> (hojas nuevas: {plan.escritura.hojasNuevas.join(", ")})</>}.
                {r.pendientes > 0 && <span style={{ color: "#b45309" }}> Quedan {r.pendientes} sin resolver: no se tocan.</span>}
              </>
            )}
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>No se tocan precios, descripciones ni unidades: eso entra por las listas de los proveedores.</div>
        </div>

        <Tabla titulo="Corregidas en la planilla" color="#166534" nota="El sistema no se movió desde la última vez: es un recuento. Vienen para entrar." filas={comparacion.recuentos} decisiones={decisiones} alDecidir={alDecidir} />
        <Tabla titulo="Cambiaron de los dos lados" color="#b91c1c" nota="La planilla y el sistema se movieron y no coinciden. Elegí cuál vale." filas={comparacion.choques} decisiones={decisiones} alDecidir={alDecidir} />
        <Tabla titulo="Sin referencia" color="#b45309" nota="La planilla todavía no tenía «Cantidad sistema»: no se sabe quién cambió. Elegí cuál vale." filas={comparacion.sinReferencia} decisiones={decisiones} alDecidir={alDecidir} />

        {comparacion.noAplicables.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12.5 }}>
            <button type="button" style={{ ...btn, padding: "2px 8px" }} onClick={() => setVerNo((v) => !v)}>
              {verNo ? "Ocultar" : "Ver"} los {comparacion.noAplicables.length} renglones de la planilla que no se pueden cruzar
            </button>
            {verNo && (
              <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 4, padding: "4px 8px" }}>
                {comparacion.noAplicables.map((x) => (
                  <div key={`${x.hoja}-${x.codigo}`}>
                    <b>{x.codigo}</b> {x.descripcion} <span style={{ color: "#64748b" }}>({x.hoja})</span> — <span style={{ color: "#b45309" }}>{x.motivo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {error && <span data-error-cantidades style={{ color: "#b91c1c", fontSize: 12.5, fontWeight: 700 }}>{error}</span>}
          {!vista.handle && !nada && <span style={{ color: "#64748b", fontSize: 12 }}>Este navegador no puede escribir el archivo: la planilla actualizada se descarga.</span>}
          <button
            type="button"
            data-sincronizar-cantidades
            disabled={nada || guardando}
            onClick={() => onSincronizar(decisiones)}
            style={{ ...btn, marginLeft: "auto", background: nada || guardando ? "#e2e8f0" : "#16a34a", color: nada || guardando ? "#64748b" : "#fff", borderColor: "transparent", padding: "8px 16px", cursor: nada || guardando ? "default" : "pointer" }}
          >
            {guardando ? "Escribiendo la planilla…" : nada ? "Nada para sincronizar" : "Sincronizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** El boton de la solapa Stock: abre la planilla vinculada, muestra las diferencias y sincroniza lo elegido. */
export function BotonSincronizarPlanilla({ articulos, onRecuentos }: { articulos: ArticuloParaPlanilla[]; onRecuentos: (cambios: Array<{ id: number; enPlanilla: number }>) => void }) {
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorVentana, setErrorVentana] = useState("");
  const [hecho, setHecho] = useState("");
  const [vista, setVista] = useState<Vista | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const abrir = async (file: File, handle: any | null) => {
    const { libro, hojas } = await abrirLibro(file);
    const leida = leerCantidades(hojas);
    setErrorVentana("");
    setVista({ nombre: file.name, libro, handle, hojas, comparacion: compararCantidades(leida.filas, articulos), hojasLeidas: leida.hojasLeidas });
  };

  const leer = async () => {
    setError("");
    setHecho("");
    if (!sePuedeVincular()) {
      inputRef.current?.click();
      return;
    }
    setLeyendo(true);
    try {
      let handle = await planillaVinculada();
      let file = handle ? await archivoDe(handle, true).catch(() => null) : null;
      if (!file) {
        handle = await elegirPlanilla();
        file = await archivoDe(handle, true);
      }
      if (!file) throw new Error("No se dio permiso para leer la planilla.");
      await abrir(file, handle);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || String(e));
    } finally {
      setLeyendo(false);
    }
  };

  const sincronizar = async (decisiones: Record<number, Decision>) => {
    if (!vista) return;
    const c = vista.comparacion;
    const todos = [...c.recuentos, ...c.choques, ...c.sinReferencia];
    const valePlanilla = todos.filter((x) => decisiones[x.id] === "planilla").map((x) => ({ id: x.id, enPlanilla: x.enPlanilla }));
    const sistemaGana = new Set(todos.filter((x) => decisiones[x.id] === "sistema").map((x) => x.id));
    const despues = aplicarRecuentos(articulos as any[], valePlanilla, "", () => 0) as ArticuloParaPlanilla[];
    const plan = planDeEscritura(vista.hojas, despues, sistemaGana);
    setGuardando(true);
    setErrorVentana("");
    try {
      // Primero el archivo: si no se puede escribir (esta abierto en Excel), el sistema tampoco se toca.
      if (plan.celdas.length > 0) {
        const contenido = await escribirPlan(vista.libro, plan);
        if (vista.handle) await guardarEnPlanilla(vista.handle, contenido);
        else descargarPlanilla(vista.nombre, contenido);
      }
      if (valePlanilla.length > 0) onRecuentos(valePlanilla);
      const r = plan.resumen;
      setHecho(`Sincronizado: ${valePlanilla.length} recuento${valePlanilla.length === 1 ? "" : "s"} al sistema · ${r.cantidades + r.ubicaciones} dato${r.cantidades + r.ubicaciones === 1 ? "" : "s"} y ${r.altas} alta${r.altas === 1 ? "" : "s"} a la planilla`);
      setVista(null);
    } catch (e: any) {
      setErrorVentana(e?.message || String(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <button type="button" data-sincronizar-planilla-stock onClick={leer} disabled={leyendo} title="Trae las cantidades corregidas en la planilla y escribe en la planilla las cantidades, ubicaciones y artículos nuevos del sistema." style={btn}>
        {leyendo ? "Abriendo la planilla…" : "🔄 Sincronizar cantidades con la planilla"}
      </button>
      {hecho && <span data-cantidades-hecho style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>{hecho}</span>}
      {error && <span style={{ fontSize: 12, color: "#b91c1c" }}>No se pudo abrir la planilla: {error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setLeyendo(true);
          try {
            await abrir(file, null);
          } catch (err: any) {
            setError(err?.message || String(err));
          } finally {
            setLeyendo(false);
          }
        }}
      />
      {vista && <VentanaCantidades vista={vista} articulos={articulos} guardando={guardando} error={errorVentana} onSincronizar={sincronizar} onCerrar={() => setVista(null)} />}
    </>
  );
}

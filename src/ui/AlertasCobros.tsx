// AVISO DE COBROS PROGRAMADOS, en el encabezado y visible en todas las solapas (Nicolas, 21/11/2026):
//   "cuando programamos un cobro debe avisar el sistema que ese cobro estaria por entrar, para pedir un ajuste
//    de fechas o si no confirmar que el cobro se realizo. No deberia dispararse solo."
// Cada cobro abre una ventana con las dos unicas salidas: SE COBRO (fecha real + a que cuenta entro: recien
// ahi pasa a realizado y suma) o TODAVIA NO (nueva fecha). La regla esta en domain/cobrosProgramados.ts.
// Al lado, los cobros que figuran realizados con la fecha vacia, mal tipeada o futura: se corrigen en la
// ficha del trabajo (el aviso la abre).
//
// VENTANA EMERGENTE (Nicolas, 21/11/2026): "que aparezca la ventana emergente pero que se pueda seguir
// trabajando". Cuando hay cobros para resolver aparece SOLA una ventana flotante, abajo a la derecha, sin fondo
// que tape la pantalla: se puede seguir trabajando con ella abierta, o cerrarla. Vuelve a aparecer si llega
// algo nuevo para resolver; la franja de arriba queda siempre.
import React, { useState } from "react";
import { fechaParaConfirmar, fechaParaReprogramar, type CobroConFechaMala, type CobroProgramado } from "../domain/cobrosProgramados";
import type { Cuenta } from "../domain/cuentas";
import { SelectorCuenta } from "../tabs/CuentasPanel";

const COLOR: Record<string, string> = { vencido: "#b91c1c", hoy: "#c2410c", sin_fecha: "#b91c1c", proximo: "#166534", futuro: "#475569" };
const fechaLinda = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "sin fecha");
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 700 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13 };

export function AlertasCobros({
  cobros,
  fechasMalas,
  cuentas,
  hoy,
  companyShort,
  money,
  onConfirmar,
  onReprogramar,
  onAbrirTrabajo,
  onPasarAEstimado,
}: {
  // Un cobro "realizado" con fecha futura es estimado: el aviso lo pasa con un click.
  onPasarAEstimado?: (cobro: CobroConFechaMala) => void;
  cobros: CobroProgramado[]; // los que hay que avisar (domain: cobrosParaAvisar)
  fechasMalas: CobroConFechaMala[];
  cuentas: Cuenta[];
  hoy: string;
  companyShort: (company: string) => string;
  money: (n: number, moneda?: "ARS" | "USD") => string;
  onConfirmar: (cobro: CobroProgramado, fecha: string, cuentaId: string) => void;
  onReprogramar: (cobro: CobroProgramado, fecha: string) => void;
  onAbrirTrabajo: (jobId: number) => void;
}) {
  const [abierto, setAbierto] = useState<CobroProgramado | null>(null);
  // La emergente se cierra "hasta que haya algo nuevo": se guarda con que cosas se cerro.
  const [cerradaCon, setCerradaCon] = useState<string | null>(null);
  if (cobros.length === 0 && fechasMalas.length === 0) return null;
  const paraResolver = cobros.filter((c) => c.situacion === "vencido" || c.situacion === "hoy" || c.situacion === "sin_fecha");
  const aResolver = paraResolver.length;
  const urgente = aResolver > 0 || fechasMalas.length > 0;
  const huella = [...paraResolver.map((c) => c.clave), ...fechasMalas.map((f) => `m${f.clave}`)].sort().join("|");
  const emergente = urgente && cerradaCon !== huella;
  return (
    <>
      <div
        data-alertas-cobros
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "5px 12px", fontSize: 12.5, overflowX: "auto", whiteSpace: "nowrap",
          background: urgente ? "#fef2f2" : "#f0fdf4", borderTop: `1px solid ${urgente ? "#fecaca" : "#bbf7d0"}`,
        }}
      >
        {cobros.length > 0 && (
          <strong style={{ color: urgente ? "#991b1b" : "#166534" }}>
            💰 {cobros.length} cobro{cobros.length === 1 ? "" : "s"} programado{cobros.length === 1 ? "" : "s"}
            {aResolver > 0 ? ` · ${aResolver} para confirmar o cambiar la fecha` : ""}
          </strong>
        )}
        {cobros.slice(0, 6).map((c) => (
          <button
            key={c.clave}
            type="button"
            data-cobro={c.clave}
            onClick={() => setAbierto(c)}
            title="Confirmar que se cobró o cambiarle la fecha"
            style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 12.5, color: "#334155" }}
          >
            <span style={{ color: COLOR[c.situacion], fontWeight: 700 }}>{c.texto}</span> · {companyShort(c.company)} {c.budgetNumber} {c.client} {money(c.monto, c.moneda)}
          </button>
        ))}
        {cobros.length > 6 && <span style={{ color: "#64748b" }}>y {cobros.length - 6} más…</span>}
        {fechasMalas.length > 0 && (
          <>
            <strong style={{ color: "#991b1b" }}>
              ⚠ {fechasMalas.length} cobro{fechasMalas.length === 1 ? "" : "s"} con la fecha mal
            </strong>
            {fechasMalas.slice(0, 4).map((f) => (
              <button
                key={f.clave}
                type="button"
                data-fecha-mala={f.clave}
                onClick={() => onAbrirTrabajo(f.jobId)}
                title="Abrir el trabajo para corregir la fecha del cobro"
                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 12.5, color: "#334155" }}
              >
                {companyShort(f.company)} {f.budgetNumber} {f.client} {money(f.monto)} · <span style={{ color: "#b91c1c" }}>{f.texto}</span>
              </button>
            ))}
            {fechasMalas.length > 4 && <span style={{ color: "#64748b" }}>y {fechasMalas.length - 4} más…</span>}
          </>
        )}
      </div>
      {emergente && !abierto && (
        <div
          data-emergente-cobros
          role="dialog"
          aria-label="Cobros para resolver"
          style={{
            position: "fixed", right: 16, bottom: 16, zIndex: 3500, width: "min(440px, calc(100vw - 32px))", maxHeight: "60vh", overflowY: "auto",
            background: "#fff", border: "1px solid #fecaca", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.28)", padding: 12, fontSize: 12.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <strong style={{ fontSize: 14, color: "#991b1b" }}>💰 Cobros para resolver</strong>
            <button type="button" data-seguir style={{ ...btn, marginLeft: "auto" }} onClick={() => setCerradaCon(huella)} title="Cierra esta ventana. El aviso queda arriba, y vuelve a aparecer si llega algo nuevo.">
              Seguir trabajando
            </button>
          </div>
          {paraResolver.length > 0 && (
            <div style={{ color: "#475569", marginBottom: 4 }}>
              Estos cobros programados ya tendrían que haber entrado. No cuentan como plata hasta que confirmes que se cobraron.
            </div>
          )}
          {paraResolver.map((c) => (
            <div key={c.clave} data-emergente-cobro={c.clave} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{money(c.monto, c.moneda)}</b> · {companyShort(c.company)} {c.budgetNumber} · {c.client}
                <div style={{ color: COLOR[c.situacion], fontWeight: 700 }}>{c.texto}</div>
              </div>
              <button type="button" style={{ ...btn, background: "#166534", color: "#fff", border: "none" }} onClick={() => setAbierto(c)}>
                Resolver
              </button>
            </div>
          ))}
          {fechasMalas.length > 0 && (
            <div style={{ color: "#475569", margin: "8px 0 4px", fontWeight: 700 }}>Cobros con la fecha mal</div>
          )}
          {fechasMalas.map((f) => (
            <div key={f.clave} data-emergente-fecha={f.clave} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{money(f.monto)}</b> · {companyShort(f.company)} {f.budgetNumber} · {f.client}
                <div style={{ color: "#b91c1c" }}>{f.texto}</div>
              </div>
              {f.motivo === "futura" && onPasarAEstimado ? (
                <button type="button" style={btn} onClick={() => onPasarAEstimado(f)} title="Todavía no entró: queda como cobro estimado y no cuenta hasta confirmarlo">
                  Pasar a estimado
                </button>
              ) : (
                <button type="button" style={btn} onClick={() => onAbrirTrabajo(f.jobId)}>
                  Abrir el trabajo
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {abierto && (
        <ResolverCobro
          cobro={abierto}
          cuentas={cuentas}
          hoy={hoy}
          companyShort={companyShort}
          money={money}
          onConfirmar={(fecha, cuentaId) => {
            onConfirmar(abierto, fecha, cuentaId);
            setAbierto(null);
          }}
          onReprogramar={(fecha) => {
            onReprogramar(abierto, fecha);
            setAbierto(null);
          }}
          onAbrirTrabajo={() => {
            onAbrirTrabajo(abierto.jobId);
            setAbierto(null);
          }}
          onCerrar={() => setAbierto(null)}
        />
      )}
    </>
  );
}

function ResolverCobro({
  cobro, cuentas, hoy, companyShort, money, onConfirmar, onReprogramar, onAbrirTrabajo, onCerrar,
}: {
  cobro: CobroProgramado;
  cuentas: Cuenta[];
  hoy: string;
  companyShort: (company: string) => string;
  money: (n: number, moneda?: "ARS" | "USD") => string;
  onConfirmar: (fecha: string, cuentaId: string) => void;
  onReprogramar: (fecha: string) => void;
  onAbrirTrabajo: () => void;
  onCerrar: () => void;
}) {
  const [fechaCobro, setFechaCobro] = useState(hoy);
  const [cuentaId, setCuentaId] = useState("");
  const [fechaNueva, setFechaNueva] = useState("");
  const [error, setError] = useState("");
  const confirmar = () => {
    const v = fechaParaConfirmar(fechaCobro, hoy);
    if (!v.ok) return setError(v.motivo);
    if (!cuentaId) return setError("Elegí a qué cuenta entró la plata.");
    onConfirmar(fechaCobro, cuentaId);
  };
  const reprogramar = () => {
    const v = fechaParaReprogramar(fechaNueva, hoy);
    if (!v.ok) return setError(v.motivo);
    onReprogramar(fechaNueva);
  };
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 12px", overflowY: "auto" }}>
      <div data-resolver-cobro onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16, width: "min(560px, 100%)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <strong style={{ fontSize: 15 }}>Cobro programado</strong>
          <button type="button" style={{ ...btn, marginLeft: "auto" }} onClick={onCerrar}>Cerrar</button>
        </div>
        <div style={{ fontSize: 13, marginBottom: 10 }}>
          <b>{money(cobro.monto, cobro.moneda)}</b> · presupuesto {cobro.budgetNumber} · {cobro.client} · {companyShort(cobro.company)}
          <div style={{ color: COLOR[cobro.situacion], fontWeight: 700 }}>
            {cobro.texto}
            {cobro.fecha ? ` (previsto para el ${fechaLinda(cobro.fecha)})` : ""} · {cobro.estado}
          </div>
          <div style={{ color: "#64748b", fontSize: 12 }}>Mientras no se confirme, este cobro no suma en el trabajo ni en ninguna cuenta.</div>
        </div>

        <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Se cobró</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <label style={{ display: "block", fontSize: 12, color: "#475569" }}>
              Fecha en que entró
              <br />
              <input data-fecha-cobro type="date" style={input} value={fechaCobro} min="2015-01-01" max={hoy} onChange={(e) => { setFechaCobro(e.target.value); setError(""); }} />
            </label>
            <SelectorCuenta cuentas={cuentas} company={cobro.company} moneda={cobro.moneda} value={cuentaId} onChange={(id) => { setCuentaId(id); setError(""); }} label="A qué cuenta entró" />
            <button type="button" data-confirmar style={{ ...btn, background: "#166534", color: "#fff", border: "none" }} onClick={confirmar}>
              Confirmar el cobro
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Todavía no entró</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <label style={{ display: "block", fontSize: 12, color: "#475569" }}>
              Nueva fecha prevista
              <br />
              <input data-fecha-nueva type="date" style={input} value={fechaNueva} min={hoy} max="2100-12-31" onChange={(e) => { setFechaNueva(e.target.value); setError(""); }} />
            </label>
            <button type="button" data-reprogramar style={btn} onClick={reprogramar}>
              Cambiar la fecha
            </button>
          </div>
        </div>

        {error && <div data-error style={{ color: "#b91c1c", fontSize: 12.5, marginBottom: 8 }}>{error}</div>}
        <button type="button" style={btn} onClick={onAbrirTrabajo}>Abrir el trabajo</button>
      </div>
    </div>
  );
}

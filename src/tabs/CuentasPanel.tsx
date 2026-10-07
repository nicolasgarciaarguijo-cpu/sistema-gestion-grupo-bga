import React, { useMemo, useState } from "react";
import { Panel, ButtonLike, AmountInput, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { styles } from "../ui/styles";
import { money } from "../lib/format";
import { idCajaPersona, idCuentaBanco, type Cuenta, type SaldoCuenta } from "../domain/cuentas";

// CUENTAS: de donde sale y a donde entra la plata. Bancos (en $ y U$S), efectivo blanco y negro y cajas
// por persona, por empresa. El saldo de cada una = apertura + lo CARGADO en el sistema desde la fecha de
// apertura. El resumen del banco queda como CONTROL: se compara su saldo con el del sistema.

type Control = { cuentaId: string; fecha: string; saldoExtracto: number; saldoSistema: number; diferencia: number; cierra: boolean };
const TIPO_LABEL: Record<Cuenta["tipo"], string> = { banco: "Banco", efectivo: "Efectivo", persona: "Caja de persona" };
const fmt = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

export function CuentasPanel({
  saldos,
  control,
  companyOptions,
  onSave,
}: {
  saldos: SaldoCuenta[];
  control: Control[];
  companyOptions: Array<{ value: string; short?: string; primary?: string }>;
  onSave: (cuenta: Cuenta) => void;
}) {
  const [menu, setMenu] = useState<null | { x: number; y: number; c: SaldoCuenta }>(null);
  const [nueva, setNueva] = useState<null | { company: string; tipo: "banco" | "persona"; nombre: string; moneda: "ARS" | "USD"; color: "blanco" | "negro" }>(null);
  const short = (c: string) => companyOptions.find((o) => o.value === c)?.short || c;
  const color = (c: string) => companyOptions.find((o) => o.value === c)?.primary || "#64748b";
  const filas = useMemo(
    () =>
      saldos
        .slice()
        .sort(
          (a, b) =>
            a.company.localeCompare(b.company) ||
            ["banco", "efectivo", "persona"].indexOf(a.tipo) - ["banco", "efectivo", "persona"].indexOf(b.tipo) ||
            a.moneda.localeCompare(b.moneda) ||
            a.nombre.localeCompare(b.nombre)
        ),
    [saldos]
  );
  const guardar = (c: SaldoCuenta, cambio: Partial<Cuenta>) => {
    const { saldo: _s, movimientos: _m, ultimoMovimiento: _u, ...cuenta } = c;
    onSave({ ...cuenta, ...cambio });
  };
  const td: React.CSSProperties = { padding: "5px 8px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };

  return (
    <Panel
      title="Cuentas · de dónde sale y a dónde entra la plata"
      span="full"
      actions={
        <ButtonLike onClick={() => setNueva({ company: companyOptions[0]?.value || "", tipo: "banco", nombre: "", moneda: "ARS", color: "blanco" })}>
          + Cuenta
        </ButtonLike>
      }
    >
      <div style={{ ...styles.muted, marginBottom: 8 }}>
        El saldo de cada cuenta sale de lo que se carga en el sistema (cobros, pagos, gastos, sueldos, caja chica,
        pases…) desde su fecha de apertura. El resumen del banco ya no carga: sirve de <strong>control</strong>, y si
        su saldo no coincide con el del sistema se marca la diferencia. Click derecho sobre una cuenta para corregir la
        apertura, marcarla principal o desactivarla.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="planilla" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", fontSize: 12, color: "#475569" }}>
              <th style={{ ...td, textAlign: "left" }}>Cuenta</th>
              <th style={{ ...td, textAlign: "left" }}>Tipo</th>
              <th style={{ ...td, textAlign: "right" }}>Apertura</th>
              <th style={{ ...td, textAlign: "right" }}>Saldo hoy (sistema)</th>
              <th style={{ ...td, textAlign: "left" }}>Control con el extracto</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => {
              const ctrl = control.find((x) => x.cuentaId === c.id);
              return (
                <tr
                  key={c.id}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    setMenu({ x: ev.clientX, y: ev.clientY, c });
                  }}
                  style={{ opacity: c.activa === false ? 0.45 : 1, cursor: "context-menu" }}
                >
                  <td style={{ ...td, boxShadow: `inset 4px 0 0 ${color(c.company)}`, fontWeight: 600 }}>
                    {c.nombre}
                    {c.principal && <span style={{ ...styles.statusPill, ...styles.statusGreen, marginLeft: 6 }}>principal</span>}
                    {c.color === "negro" && c.tipo !== "banco" && (
                      <span style={{ ...styles.statusPill, background: "#334155", color: "#fff", marginLeft: 6 }}>N</span>
                    )}
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{short(c.company)}</div>
                  </td>
                  <td style={td}>
                    {TIPO_LABEL[c.tipo]} {c.moneda === "USD" ? "U$S" : "$"}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {money(c.saldoApertura, c.moneda)}
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>al {fmt(c.fechaApertura)}</div>
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: c.saldo < 0 ? "#b91c1c" : undefined }}>
                    {money(c.saldo, c.moneda)}
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{c.movimientos} movimiento{c.movimientos === 1 ? "" : "s"}</div>
                  </td>
                  <td style={td}>
                    {c.tipo !== "banco" ? (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    ) : !ctrl ? (
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>Sin resumen posterior a la apertura</span>
                    ) : ctrl.cierra ? (
                      <span style={{ color: "#166534", fontWeight: 700 }}>✓ coincide al {fmt(ctrl.fecha)}</span>
                    ) : (
                      <span style={{ color: "#b91c1c", fontWeight: 700 }} title={`Resumen: ${money(ctrl.saldoExtracto)} · Sistema: ${money(ctrl.saldoSistema)}`}>
                        ≠ al {fmt(ctrl.fecha)}: diferencia {money(ctrl.diferencia)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>{menu.c.nombre}</QuickMenuTitle>
          <button
            style={quickMenuItem}
            onClick={() => {
              const c = menu.c;
              setMenu(null);
              const v = window.prompt(`Saldo de apertura de ${c.nombre} al ${fmt(c.fechaApertura)}:`, String(c.saldoApertura));
              if (v === null) return;
              const n = Number(v.replace(/\./g, "").replace(",", "."));
              if (Number.isFinite(n)) guardar(c, { saldoApertura: n });
            }}
          >
            Corregir el saldo de apertura…
          </button>
          <button
            style={quickMenuItem}
            onClick={() => {
              const c = menu.c;
              setMenu(null);
              const v = window.prompt("Fecha de apertura (dd/mm/aaaa). Cuentan los movimientos posteriores:", fmt(c.fechaApertura));
              const m = v && /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
              if (m) guardar(c, { fechaApertura: `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` });
            }}
          >
            Cambiar la fecha de apertura…
          </button>
          <button
            style={quickMenuItem}
            onClick={() => {
              const c = menu.c;
              setMenu(null);
              const v = window.prompt("Nombre de la cuenta:", c.nombre);
              if (v && v.trim()) guardar(c, { nombre: v.trim() });
            }}
          >
            Renombrar…
          </button>
          {menu.c.tipo === "banco" && (
            <button
              style={quickMenuItem}
              onClick={() => {
                guardar(menu.c, { principal: !menu.c.principal });
                setMenu(null);
              }}
            >
              {menu.c.principal ? "Quitar como principal" : "Marcar como cuenta principal (por defecto)"}
            </button>
          )}
          <QuickMenuSep />
          <button
            style={quickMenuItem}
            onClick={() => {
              guardar(menu.c, { activa: menu.c.activa === false });
              setMenu(null);
            }}
          >
            {menu.c.activa === false ? "Reactivar" : "Desactivar (no se ofrece al cargar)"}
          </button>
        </QuickMenu>
      )}

      {nueva && (
        <div style={{ ...styles.noticeBox, marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Nueva cuenta</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <label style={{ fontSize: 12 }}>
              Empresa
              <select style={styles.input} value={nueva.company} onChange={(e) => setNueva({ ...nueva, company: e.target.value })}>
                {companyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.short || o.value}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              Tipo
              <select style={styles.input} value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value as any })}>
                <option value="banco">Cuenta bancaria</option>
                <option value="persona">Caja de una persona</option>
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              {nueva.tipo === "banco" ? "Banco" : "Persona"}
              <input style={styles.input} value={nueva.nombre} placeholder={nueva.tipo === "banco" ? "Ej. Galicia" : "Ej. Joaquín"} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />
            </label>
            {nueva.tipo === "banco" ? (
              <label style={{ fontSize: 12 }}>
                Moneda
                <select style={styles.input} value={nueva.moneda} onChange={(e) => setNueva({ ...nueva, moneda: e.target.value as any })}>
                  <option value="ARS">$ Pesos</option>
                  <option value="USD">U$S Dólares</option>
                </select>
              </label>
            ) : (
              <label style={{ fontSize: 12 }}>
                Plata
                <select style={styles.input} value={nueva.color} onChange={(e) => setNueva({ ...nueva, color: e.target.value as any })}>
                  <option value="blanco">Blanca</option>
                  <option value="negro">Negra</option>
                </select>
              </label>
            )}
            <ButtonLike
              disabled={!nueva.nombre.trim()}
              onClick={() => {
                const nombre = nueva.nombre.trim();
                const hoy = new Date().toISOString().slice(0, 10);
                if (nueva.tipo === "banco") {
                  onSave({
                    id: idCuentaBanco(nueva.company, nombre, nueva.moneda),
                    company: nueva.company,
                    tipo: "banco",
                    nombre: `${nombre} ${nueva.moneda === "USD" ? "U$S" : "$"}`,
                    banco: nombre,
                    moneda: nueva.moneda,
                    color: "blanco",
                    saldoApertura: 0,
                    fechaApertura: hoy,
                    activa: true,
                  });
                } else {
                  onSave({
                    id: idCajaPersona(nueva.company, nombre, nueva.color),
                    company: nueva.company,
                    tipo: "persona",
                    nombre: `Caja de ${nombre}${nueva.color === "negro" ? " (negro)" : ""}`,
                    persona: nombre,
                    moneda: "ARS",
                    color: nueva.color,
                    saldoApertura: 0,
                    fechaApertura: hoy,
                    activa: true,
                  });
                }
                setNueva(null);
              }}
            >
              Crear
            </ButtonLike>
            <ButtonLike secondary onClick={() => setNueva(null)}>
              Cancelar
            </ButtonLike>
          </div>
        </div>
      )}
    </Panel>
  );
}

// Selector de cuenta para los formularios de carga. Vacio = la cuenta por defecto (segun como se pago).
export function SelectorCuenta({
  cuentas,
  company,
  moneda,
  value,
  onChange,
  label = "Cuenta",
  vacio = "Por defecto (según cómo se pagó)",
}: {
  cuentas: Cuenta[];
  company: string;
  moneda?: "ARS" | "USD";
  value?: string;
  onChange: (id: string) => void;
  label?: string;
  vacio?: string;
}) {
  const opciones = cuentas
    .filter((c) => c.company === company && c.activa !== false && (!moneda || c.moneda === moneda))
    .sort((a, b) => ["banco", "efectivo", "persona"].indexOf(a.tipo) - ["banco", "efectivo", "persona"].indexOf(b.tipo) || a.nombre.localeCompare(b.nombre));
  return (
    <label style={{ display: "block", fontSize: 12, color: "#475569" }}>
      {label}
      <select style={styles.input} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">{vacio}</option>
        {opciones.map((c) => (
          <option key={c.id} value={c.id}>
            {c.tipo === "banco" ? "🏦 " : c.tipo === "persona" ? "👤 " : "💵 "}
            {c.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

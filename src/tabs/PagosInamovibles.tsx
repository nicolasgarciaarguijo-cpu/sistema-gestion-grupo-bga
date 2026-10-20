import React, { useMemo, useState } from "react";
import { Panel, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { styles } from "../ui/styles";
import { money } from "../lib/format";
import { ORIGEN_LABEL, type ItemInamovible } from "../domain/agendaInamovibles";
import type { Vencimiento } from "../domain/vencimientos";
import type { CalSection } from "../domain/calendarStructure";

// PAGOS PROGRAMADOS (antes "pagos inamovibles"): arriba de la planilla del Calendario anual. Muestra SOLO los pagos que no se
// pueden fallar (no todo el cash flow), juntados de donde ya estan en el sistema mas los vencimientos
// cargados a mano. Toda accion sobre un pago sale del click derecho (regla del sistema).

const ESTADO_COLOR: Record<ItemInamovible["estado"], { fg: string; bg: string }> = {
  vencido: { fg: "#991b1b", bg: "#fee2e2" },
  hoy: { fg: "#9a3412", bg: "#ffedd5" },
  proximo: { fg: "#92400e", bg: "#fef3c7" },
  en_ventana: { fg: "#1e40af", bg: "#dbeafe" },
  futuro: { fg: "#475569", bg: "#f1f5f9" },
  pagado: { fg: "#166534", bg: "#dcfce7" },
};

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtFecha = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

type CompanyOpt = { value: string; short?: string; primary?: string; soft?: string };

export type PagosInamoviblesProps = {
  items: ItemInamovible[];
  hoy: string;
  vencimientos: Vencimiento[];
  companyOptions: CompanyOpt[];
  sections: CalSection[];
  canEdit: boolean;
  onSetPagado: (item: ItemInamovible, pagado: boolean) => void;
  onConfirmarFecha: (item: ItemInamovible, fecha: string) => void;
  onMontoOcurrencia: (item: ItemInamovible, monto: number) => void;
  onSaveVencimiento: (v: Vencimiento) => void;
  onDeleteVencimiento: (id: number) => void;
  onIrAlOrigen: (item: ItemInamovible) => void;
  // Estado del pago (el mismo que en Compras y analisis de gastos).
  onEstadoPago?: (item: ItemInamovible, estado: "programado" | "estimado" | "inamovible") => void;
};

// Estado por defecto segun el origen (tarjeta y cuota no se pueden correr) y sus colores.
const estadoDe = (i: ItemInamovible) => i.estadoPago || (i.origen === "tarjeta" || i.origen === "deuda" ? "inamovible" : "programado");
const ESTADO_PAGO = {
  programado: { label: "Programado", fg: "#0f766e", bg: "#ccfbf1" },
  estimado: { label: "Estimado", fg: "#7c3aed", bg: "#ede9fe" },
  inamovible: { label: "Inamovible", fg: "#dc2626", bg: "#fee2e2" },
} as const;

export function PagosInamovibles(props: PagosInamoviblesProps) {
  const { items, hoy, companyOptions, canEdit } = props;
  const [empresa, setEmpresa] = useState<string>("__ALL__");
  const [mes, setMes] = useState<string>(hoy.slice(0, 7));
  const [menu, setMenu] = useState<null | { x: number; y: number; item: ItemInamovible }>(null);

  const meta = (company: string) => companyOptions.find((c) => c.value === company);
  const filtrados = useMemo(
    () => items.filter((i) => empresa === "__ALL__" || i.company === empresa),
    [items, empresa]
  );
  // La lista: SOLO lo vencido sin pagar (Nicolas, 2026-10-20: "quiero que sirva para ver algo pendiente de
  // pago y que se deberia haber pagado"). Lo que viene se ve en el almanaque.
  const lista = useMemo(
    () => filtrados.filter((i) => i.estado === "vencido" && !i.pagado).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite)),
    [filtrados]
  );
  const alertas = filtrados.filter((i) => i.alerta);
  const porDia = useMemo(() => {
    const m = new Map<string, ItemInamovible[]>();
    filtrados
      .filter((i) => i.fechaLimite.startsWith(mes))
      .forEach((i) => m.set(i.fechaLimite, [...(m.get(i.fechaLimite) || []), i]));
    return m;
  }, [filtrados, mes]);

  const [y, mo] = mes.split("-").map(Number);
  const primerDow = (new Date(y, mo - 1, 1).getDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(y, mo, 0).getDate();
  const celdas: Array<number | null> = [
    ...Array.from({ length: primerDow }, () => null),
    ...Array.from({ length: diasMes }, (_, i) => i + 1),
  ];
  const mover = (n: number) => {
    const d = new Date(y, mo - 1 + n, 1);
    setMes(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const abrirMenu = (ev: React.MouseEvent, item: ItemInamovible) => {
    ev.preventDefault();
    ev.stopPropagation();
    setMenu({ x: ev.clientX, y: ev.clientY, item });
  };

  const totalesMes = useMemo(() => {
    const t = { ars: 0, usd: 0, pendienteArs: 0 };
    filtrados
      .filter((i) => i.fechaLimite.startsWith(mes))
      .forEach((i) => {
        if (i.currency === "USD") t.usd += i.monto;
        else {
          t.ars += i.monto;
          if (!i.pagado) t.pendienteArs += i.monto;
        }
      });
    return t;
  }, [filtrados, mes]);

  return (
    <Panel
      title={`Pagos programados${alertas.length ? ` · ${alertas.length} con aviso` : ""}`}
      span="full"
    >
      <div style={{ ...styles.muted, marginBottom: 8 }}>
        Las fechas que no se pueden fallar. Se juntan solas de donde ya están cargadas: cuotas de
        Desendeudamiento, cierres de cada tarjeta, facturas a pagar (el plazo sale del proveedor), seguros y
        sueldos. Es solo para ver: el pago se carga y se marca en su solapa (click derecho → “Ir a donde se
        carga”).
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <select style={{ ...styles.input, width: "auto" }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
          <option value="__ALL__">Todas las empresas</option>
          {companyOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.short || c.value}
            </option>
          ))}
        </select>
        <button style={styles.smallBtn} onClick={() => mover(-1)}>◀</button>
        <strong style={{ minWidth: 130, textAlign: "center" }}>
          {MESES[mo - 1]} {y}
        </strong>
        <button style={styles.smallBtn} onClick={() => mover(1)}>▶</button>
        <button style={styles.smallBtn} onClick={() => setMes(hoy.slice(0, 7))}>Hoy</button>
        <span style={{ fontSize: 13, color: "#334155" }}>
          Mes: <strong>{money(totalesMes.ars)}</strong>
          {totalesMes.usd > 0 && (
            <>
              {" "}+ <strong>{money(totalesMes.usd, "USD")}</strong>
            </>
          )}{" "}
          · falta pagar <strong style={{ color: "#b91c1c" }}>{money(totalesMes.pendienteArs)}</strong>
        </span>
      </div>

      <div style={{ display: "grid", gap: 14, alignItems: "start" }}>
        {/* Almanaque del mes: a todo el ancho */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {DIAS.map((d) => (
              <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textAlign: "center" }}>
                {d}
              </div>
            ))}
            {celdas.map((dia, idx) => {
              if (!dia) return <div key={`v${idx}`} />;
              const isoDia = `${mes}-${pad(dia)}`;
              const del = porDia.get(isoDia) || [];
              const esHoy = isoDia === hoy;
              return (
                <div
                  key={isoDia}
                  style={{
                    minHeight: 96,
                    border: esHoy ? "2px solid #0f172a" : "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: 3,
                    background: (idx % 7) >= 5 ? "#fef2f2" : "#fff",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{dia}</div>
                  {del.map((i) => {
                    const c = ESTADO_COLOR[i.estado];
                    return (
                      <div
                        key={i.clave}
                        title={`${i.titulo} · ${money(i.monto, i.currency)} · ${i.texto}`}
                        onContextMenu={(ev) => abrirMenu(ev, i)}
                        style={{
                          fontSize: 11.5,
                          lineHeight: 1.3,
                          background: c.bg,
                          color: c.fg,
                          borderLeft: `3px solid ${meta(i.company)?.primary || c.fg}`,
                          borderRadius: 3,
                          padding: "1px 3px",
                          marginTop: 2,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          textDecoration: i.pagado ? "line-through" : undefined,
                          cursor: "context-menu",
                        }}
                      >
                        {i.titulo}
                        {i.monto > 0 && <span style={{ fontWeight: 700 }}> · {money(i.monto, i.currency)}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* VENCIDOS SIN PAGAR: lo que se tendria que haber pagado. Sin nada vencido, no hay lista. */}
        {lista.length > 0 && (
        <div style={{ ...styles.calendarScroll, maxHeight: 420 }}>
          <div style={{ fontWeight: 800, color: "#b91c1c", margin: "2px 0 6px" }}>
            ⚠ Vencidos sin pagar ({lista.length}) · {money(lista.filter((i) => i.currency !== "USD").reduce((a, i) => a + i.monto, 0))}
          </div>
          <table className="planilla" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>Fecha</th>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>Pago</th>
                <th style={{ textAlign: "right", padding: "4px 6px" }}>Monto</th>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>Aviso</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 8, color: "#94a3b8" }}>
                    No hay pagos vencidos sin pagar.
                  </td>
                </tr>
              ) : (
                lista.map((i, idx) => {
                  const c = ESTADO_COLOR[i.estado];
                  const m = meta(i.company);
                  // SALTO DE AÑO: si el pago anterior es de otro ejercicio (nov-oct), una linea que lo marca.
                  const inicioEj = (iso: string) => {
                    const y = Number(iso.slice(0, 4));
                    return Number(iso.slice(5, 7)) >= 11 ? `${y}-11-01` : `${y - 1}-11-01`;
                  };
                  const salto = idx > 0 && inicioEj(lista[idx - 1].fechaLimite) !== inicioEj(i.fechaLimite);
                  return (
                    <React.Fragment key={i.clave}>
                    {salto && (
                      <tr>
                        <td colSpan={4} style={{ padding: "3px 6px", background: "#f5f3ff", color: "#6d28d9", fontWeight: 800, fontSize: 11.5, borderTop: "2px solid #7c3aed" }}>
                          ◆ Salto de año · empieza el ejercicio {inicioEj(i.fechaLimite).slice(0, 4)}-{Number(inicioEj(i.fechaLimite).slice(0, 4)) + 1}
                        </td>
                      </tr>
                    )}
                    <tr onContextMenu={(ev) => abrirMenu(ev, i)} style={{ cursor: "context-menu" }}>
                      <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                        {fmtFecha(i.fechaLimite)}
                        {i.origen === "manual" && !i.fechaConfirmada && (
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>límite de la ventana</div>
                        )}
                      </td>
                      <td style={{ padding: "4px 6px", boxShadow: `inset 3px 0 0 ${m?.primary || "#cbd5e1"}` }}>
                        <strong>{i.titulo}</strong>
                        {!i.pagado && (
                          <span
                            style={{
                              marginLeft: 6, padding: "0 6px", borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                              color: ESTADO_PAGO[estadoDe(i)].fg, background: ESTADO_PAGO[estadoDe(i)].bg,
                            }}
                          >
                            {ESTADO_PAGO[estadoDe(i)].label}
                          </span>
                        )}
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {m?.short || i.company} · {ORIGEN_LABEL[i.origen]}
                          {i.detalle ? ` · ${i.detalle}` : ""}
                        </div>
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                        {i.monto > 0 ? money(i.monto, i.currency) : "—"}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        <span style={{ ...styles.statusPill, background: c.bg, color: c.fg }}>{i.texto}</span>
                      </td>
                    </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
        {lista.length === 0 && (
          <div style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>✓ No hay pagos vencidos sin pagar.</div>
        )}
      </div>

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>
            {menu.item.titulo} · {fmtFecha(menu.item.fechaLimite)}
          </QuickMenuTitle>
          <div style={{ fontSize: 11.5, color: ESTADO_PAGO[estadoDe(menu.item)].fg, padding: "2px 8px 4px", fontWeight: 700 }}>
            {menu.item.pagado ? "✓ Pagado" : ESTADO_PAGO[estadoDe(menu.item)].label}
          </div>
          {menu.item.origen === "manual" && (
            <>
              <div style={{ fontSize: 11, color: "#64748b", padding: "2px 8px 4px", lineHeight: 1.4, maxWidth: 280 }}>
                Vencimiento cargado a mano antes. Ya no se cargan acá: las fechas salen de Desendeudamiento,
                de las tarjetas y del plazo de cada proveedor.
              </div>
              {canEdit && (
                <button
                  style={{ ...quickMenuItem, color: "#b91c1c" }}
                  onClick={() => {
                    const id = Number(menu.item.refId);
                    setMenu(null);
                    if (window.confirm(`¿Borrar el vencimiento "${menu.item.titulo}"? Se borran todas sus fechas.`))
                      props.onDeleteVencimiento(id);
                  }}
                >
                  Borrar el vencimiento
                </button>
              )}
            </>
          )}
          {menu.item.origen !== "manual" && (
            <>
              <QuickMenuSep />
              <button
                style={quickMenuItem}
                onClick={() => {
                  props.onIrAlOrigen(menu.item);
                  setMenu(null);
                }}
              >
                Ir a donde se carga ({ORIGEN_LABEL[menu.item.origen]})
              </button>
            </>
          )}
        </QuickMenu>
      )}

    </Panel>
  );
}

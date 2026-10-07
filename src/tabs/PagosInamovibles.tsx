import React, { useMemo, useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem, AmountInput } from "../ui/primitives";
import { styles } from "../ui/styles";
import { money } from "../lib/format";
import { ORIGEN_LABEL, type ItemInamovible } from "../domain/agendaInamovibles";
import { textoVentana, type Vencimiento, type VencimientoRecurrencia, type VencimientoTipo } from "../domain/vencimientos";
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
};

const nuevoVencimiento = (company: string): Vencimiento => ({
  id: 0,
  company,
  titulo: "",
  tipo: "impuesto",
  monto: 0,
  currency: "ARS",
  administration: "blanco",
  conceptKey: "",
  recurrencia: "mensual",
  diaDesde: 10,
  diaHasta: 15,
  mes: 1,
  fechaDesde: "",
  fechaHasta: "",
  avisoDias: 5,
  activo: true,
  ocurrencias: {},
  notas: "",
});

export function PagosInamovibles(props: PagosInamoviblesProps) {
  const { items, hoy, companyOptions, sections, canEdit } = props;
  const [empresa, setEmpresa] = useState<string>("__ALL__");
  const [mes, setMes] = useState<string>(hoy.slice(0, 7));
  const [menu, setMenu] = useState<null | { x: number; y: number; item: ItemInamovible }>(null);
  const [form, setForm] = useState<Vencimiento | null>(null);

  const meta = (company: string) => companyOptions.find((c) => c.value === company);
  const filtrados = useMemo(
    () => items.filter((i) => empresa === "__ALL__" || i.company === empresa),
    [items, empresa]
  );
  // La lista: lo que esta sonando (vencido impago, hoy, proximo, en ventana) + todo lo del mes elegido.
  const lista = useMemo(
    () => filtrados.filter((i) => i.alerta || i.fechaLimite.startsWith(mes)),
    [filtrados, mes]
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

  const egresos = sections.filter((s) => s.dir === "out");

  return (
    <Panel
      title={`Pagos programados${alertas.length ? ` · ${alertas.length} con aviso` : ""}`}
      span="full"
      actions={
        canEdit ? (
          <ButtonLike onClick={() => setForm(nuevoVencimiento(empresa === "__ALL__" ? companyOptions[0]?.value || "" : empresa))}>
            + Vencimiento
          </ButtonLike>
        ) : undefined
      }
    >
      <div style={{ ...styles.muted, marginBottom: 8 }}>
        Las fechas que no se pueden fallar. Se juntan solas de cuotas de deudas, resúmenes de tarjeta,
        pagos programados del cash flow, seguros y sueldos; los demás (VEP, sindicato, F.931, cheques…) se
        cargan con "+ Vencimiento". Click derecho sobre un pago para marcarlo pagado, confirmar la fecha o
        editarlo.
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.4fr)", gap: 14, alignItems: "start" }}>
        {/* Almanaque del mes */}
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
                    minHeight: 54,
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
                          fontSize: 10,
                          lineHeight: 1.25,
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
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Agenda: lo que suena + el mes */}
        <div style={{ ...styles.calendarScroll, maxHeight: 420 }}>
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
                    No hay pagos programados en {MESES[mo - 1].toLowerCase()} ni avisos pendientes.
                  </td>
                </tr>
              ) : (
                lista.map((i) => {
                  const c = ESTADO_COLOR[i.estado];
                  const m = meta(i.company);
                  return (
                    <tr key={i.clave} onContextMenu={(ev) => abrirMenu(ev, i)} style={{ cursor: "context-menu" }}>
                      <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                        {fmtFecha(i.fechaLimite)}
                        {i.origen === "manual" && !i.fechaConfirmada && (
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>límite de la ventana</div>
                        )}
                      </td>
                      <td style={{ padding: "4px 6px", boxShadow: `inset 3px 0 0 ${m?.primary || "#cbd5e1"}` }}>
                        <strong>{i.titulo}</strong>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>
            {menu.item.titulo} · {fmtFecha(menu.item.fechaLimite)}
          </QuickMenuTitle>
          {canEdit && (
            <button
              style={quickMenuItem}
              onClick={() => {
                props.onSetPagado(menu.item, !menu.item.pagado);
                setMenu(null);
              }}
            >
              {menu.item.pagado ? "Marcar como NO pagado" : "Marcar como pagado"}
            </button>
          )}
          {canEdit && menu.item.origen === "manual" && (
            <>
              <button
                style={quickMenuItem}
                onClick={() => {
                  const f = window.prompt(
                    "Fecha exacta del pago (dd/mm/aaaa). Con la fecha confirmada baja al cash flow.",
                    fmtFecha(menu.item.fechaConfirmada || menu.item.fechaLimite) + "/" + menu.item.fechaLimite.slice(0, 4)
                  );
                  setMenu(null);
                  if (f === null) return;
                  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(f.trim());
                  if (!f.trim()) props.onConfirmarFecha(menu.item, "");
                  else if (m) props.onConfirmarFecha(menu.item, `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`);
                  else window.alert("La fecha tiene que ser dd/mm/aaaa.");
                }}
              >
                {menu.item.fechaConfirmada ? "Cambiar la fecha confirmada…" : "Confirmar la fecha exacta…"}
              </button>
              <button
                style={quickMenuItem}
                onClick={() => {
                  const f = window.prompt("Monto de ESTE vencimiento (solo este mes/año):", String(menu.item.monto || ""));
                  setMenu(null);
                  if (f === null) return;
                  const n = Number(f.replace(/\./g, "").replace(",", "."));
                  if (Number.isFinite(n)) props.onMontoOcurrencia(menu.item, n);
                }}
              >
                Cambiar el monto de esta vez…
              </button>
              <QuickMenuSep />
              <button
                style={quickMenuItem}
                onClick={() => {
                  const v = props.vencimientos.find((x) => x.id === menu.item.refId);
                  if (v) setForm({ ...v });
                  setMenu(null);
                }}
              >
                Editar el vencimiento…
              </button>
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

      {form && (
        <FormVencimiento
          inicial={form}
          companyOptions={companyOptions}
          egresos={egresos}
          onCancel={() => setForm(null)}
          onSave={(v) => {
            props.onSaveVencimiento(v);
            setForm(null);
          }}
        />
      )}
    </Panel>
  );
}

function FormVencimiento({
  inicial,
  companyOptions,
  egresos,
  onCancel,
  onSave,
}: {
  inicial: Vencimiento;
  companyOptions: CompanyOpt[];
  egresos: CalSection[];
  onCancel: () => void;
  onSave: (v: Vencimiento) => void;
}) {
  const [v, setV] = useState<Vencimiento>(inicial);
  const set = <K extends keyof Vencimiento>(k: K, val: Vencimiento[K]) => setV((p) => ({ ...p, [k]: val }));
  const lbl: React.CSSProperties = { fontSize: 12, color: "#475569", display: "block", marginBottom: 2 };
  const campo = (label: string, el: React.ReactNode) => (
    <label style={{ display: "block" }}>
      <span style={lbl}>{label}</span>
      {el}
    </label>
  );
  const valido =
    !!v.titulo.trim() &&
    (v.recurrencia === "unica" ? !!(v.fechaDesde || v.fechaHasta) : !!v.diaDesde);
  return (
    <div style={{ ...styles.noticeBox, marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{v.id ? "Editar vencimiento" : "Nuevo vencimiento"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {campo("Qué se paga", <input style={styles.input} value={v.titulo} placeholder="Ej. VEP IVA, Sindicato, F.931, Echeq…" onChange={(e) => set("titulo", e.target.value)} />)}
        {campo(
          "Empresa",
          <select style={styles.input} value={v.company} onChange={(e) => set("company", e.target.value)}>
            {companyOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.short || c.value}</option>
            ))}
          </select>
        )}
        {campo(
          "Tipo",
          <select style={styles.input} value={v.tipo} onChange={(e) => set("tipo", e.target.value as VencimientoTipo)}>
            <option value="impuesto">Impuesto / VEP</option>
            <option value="deuda">Deuda / cuota / cheque</option>
            <option value="sueldos">Sueldos / sindicato / cargas</option>
            <option value="servicio">Servicio / proveedor</option>
            <option value="otro">Otro</option>
          </select>
        )}
        {campo(
          "Se repite",
          <select style={styles.input} value={v.recurrencia} onChange={(e) => set("recurrencia", e.target.value as VencimientoRecurrencia)}>
            <option value="mensual">Todos los meses</option>
            <option value="anual">Una vez por año</option>
            <option value="unica">Una sola vez</option>
          </select>
        )}
        {v.recurrencia === "unica" ? (
          <>
            {campo("Desde", <input style={styles.input} type="date" value={v.fechaDesde || ""} onChange={(e) => set("fechaDesde", e.target.value)} />)}
            {campo("Hasta (límite)", <input style={styles.input} type="date" value={v.fechaHasta || ""} onChange={(e) => set("fechaHasta", e.target.value)} />)}
          </>
        ) : (
          <>
            {v.recurrencia === "anual" &&
              campo(
                "Mes",
                <select style={styles.input} value={v.mes || 1} onChange={(e) => set("mes", Number(e.target.value))}>
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              )}
            {campo("Entre el día", <input style={styles.input} type="number" min={1} max={31} value={v.diaDesde || ""} onChange={(e) => set("diaDesde", Number(e.target.value))} />)}
            {campo("y el día (límite)", <input style={styles.input} type="number" min={1} max={31} value={v.diaHasta || ""} onChange={(e) => set("diaHasta", Number(e.target.value))} />)}
          </>
        )}
        {campo("Monto habitual", <AmountInput style={styles.input} value={v.monto} onChange={(n) => set("monto", n)} />)}
        {campo(
          "Moneda",
          <select style={styles.input} value={v.currency || "ARS"} onChange={(e) => set("currency", e.target.value as "ARS" | "USD")}>
            <option value="ARS">$ Pesos</option>
            <option value="USD">U$S Dólares</option>
          </select>
        )}
        {campo(
          "Administración",
          <select style={styles.input} value={v.administration} onChange={(e) => set("administration", e.target.value as "blanco" | "negro")}>
            <option value="blanco">Blanco</option>
            <option value="negro">Negro</option>
          </select>
        )}
        {campo(
          "Renglón del cash flow",
          <select style={styles.input} value={v.conceptKey || ""} onChange={(e) => set("conceptKey", e.target.value)}>
            <option value="">(sin renglón: solo aviso)</option>
            {egresos.map((s) => (
              <optgroup key={s.key} label={s.label}>
                {s.items.map((it) => (
                  <option key={it.key} value={it.key}>{it.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
        {campo("Avisar con (días antes)", <input style={styles.input} type="number" min={0} max={60} value={v.avisoDias} onChange={(e) => set("avisoDias", Number(e.target.value))} />)}
      </div>
      <div style={{ marginTop: 8 }}>
        {campo("Notas", <input style={styles.input} value={v.notas} onChange={(e) => set("notas", e.target.value)} />)}
      </div>
      <div style={{ ...styles.muted, marginTop: 6 }}>
        {v.titulo ? `${v.titulo}: ` : ""}
        {textoVentana(v)}. Avisa desde que empieza la ventana y {v.avisoDias} días antes del límite. Con renglón
        y la fecha confirmada (click derecho), baja al cash flow como previsión.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <ButtonLike onClick={() => valido && onSave(v)} disabled={!valido}>
          Guardar
        </ButtonLike>
        <ButtonLike onClick={onCancel} secondary>
          Cancelar
        </ButtonLike>
        {v.id ? (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={v.activo} onChange={(e) => set("activo", e.target.checked)} /> Activo
          </label>
        ) : null}
      </div>
    </div>
  );
}

// Solapa TARJETAS de crédito.
//
// Para qué sirve (definido con el usuario 2026-07-28): el itemizado de consumos es para IDENTIFICAR
// costos fijos/variables y así COTIZAR y preparar los marcadores. NO suma al estado de resultados
// (por eso no hay doble conteo con el pago del resumen que sale del banco). Reusa los grupos de costos
// y el motor de reglas de la solapa Costos: un consumo recurrente (Netflix, Google...) se auto-sugiere.
import React from "react";
import { styles } from "../ui/styles";
import { Panel, MiniMetric, ButtonLike, AmountInput } from "../ui/primitives";
import { money, formatDateDisplay } from "../lib/format";
import { QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import type {
  CompanyName,
  CostKind,
  CreditCard,
  CreditCardConsumption,
  CreditCardStatement,
} from "../domain/types";
import type { CardCostSummary } from "../domain/cardCosts";

type TarjetasTabProps = {
  companyScope: string;
  onScopeChange: (scope: string) => void;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  cards: CreditCard[];
  statements: CreditCardStatement[];
  consumptions: CreditCardConsumption[];
  cardCostSummary: CardCostSummary;
  manualGroupOptions: string[];
  createCostGroup: (name: string, kind: CostKind) => string;
  addCreditCard: () => void;
  removeCreditCard: (id: number) => void;
  updateCreditCard: (id: number, field: keyof CreditCard, value: any) => void;
  addCreditCardStatement: () => void;
  removeCreditCardStatement: (id: number) => void;
  updateCreditCardStatement: (id: number, field: keyof CreditCardStatement, value: any) => void;
  addCreditCardConsumption: () => void;
  removeCreditCardConsumption: (id: number) => void;
  updateCreditCardConsumption: (id: number, field: keyof CreditCardConsumption, value: any) => void;
};

const NEW_GROUP_OPTION = "__NEW_GROUP__";

export function TarjetasTab({
  companyScope,
  onScopeChange,
  COMPANY_OPTIONS,
  getCompanyMeta,
  cards,
  statements,
  consumptions,
  cardCostSummary,
  manualGroupOptions,
  createCostGroup,
  addCreditCard,
  removeCreditCard,
  updateCreditCard,
  addCreditCardStatement,
  removeCreditCardStatement,
  updateCreditCardStatement,
  addCreditCardConsumption,
  removeCreditCardConsumption,
  updateCreditCardConsumption,
}: TarjetasTabProps) {
  const inScope = (company: string) => companyScope === "__ALL__" || company === companyScope;
  const scopedCards = cards.filter((c) => inScope(c.company));
  const scopedStatements = statements.filter((s) => inScope(s.company));
  const scopedConsumptions = consumptions.filter((c) => inScope(c.company));

  // ---- PLANILLA de consumos (estetica del Calendario anual, regla del usuario 2026-08-21) --------
  // Agrupada por CIERRE: cada resumen es una seccion plegable con sus consumos, un sub-bloque con los
  // cargos del propio resumen (sellos, comision, IVA) y una fila de TOTAL que se coteja contra el
  // saldo del resumen. Si coinciden, el cierre esta bien cargado.
  const anchos = usePlanillaWidths("tarjetas.consumos", { label: 250, col: 110 });
  const [cerrados, setCerrados] = React.useState<Set<number>>(new Set());
  const plegar = (sid: number) =>
    setCerrados((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  const [menu, setMenu] = React.useState<null | { x: number; y: number; id: number }>(null);
  const abrirMenu = (ev: React.MouseEvent, id: number) => {
    ev.preventDefault();
    ev.stopPropagation();
    setMenu({ x: ev.clientX, y: ev.clientY, id });
  };
  // Los cargos que pone el banco en el cierre, no una compra: van aparte al pie de cada resumen.
  const esCargoDelResumen = (c: CreditCardConsumption) =>
    /^(IMPUESTO DE SELLOS|COMISION|DB IVA|PERCEP|INTERES|SEGURO DE VIDA)/i.test(c.description || "");
  // Un cierre = un resumen, del mas nuevo al mas viejo. Los que no tienen resumen quedan al final.
  const bloques = React.useMemo(() => {
    const porCierre = new Map<number, CreditCardConsumption[]>();
    const sueltos: CreditCardConsumption[] = [];
    scopedConsumptions.forEach((c) => {
      const sid = Number((c as any).statementId || 0);
      if (!sid) return sueltos.push(c);
      if (!porCierre.has(sid)) porCierre.set(sid, []);
      porCierre.get(sid)!.push(c);
    });
    const orden = [...scopedStatements].sort((a, b) =>
      (b.closingDate || "").localeCompare(a.closingDate || "")
    );
    return {
      cierres: orden
        .filter((st) => (porCierre.get(st.id) || []).length > 0)
        .map((st) => {
          const items = porCierre.get(st.id) || [];
          const compras = items.filter((c) => !esCargoDelResumen(c));
          const cargos = items.filter(esCargoDelResumen);
          const total = items.reduce((a, c) => a + Number(c.amount || 0), 0);
          return { st, compras, cargos, total, difiere: Math.abs(total - Number(st.totalArs || 0)) > 1 };
        }),
      sueltos,
    };
  }, [scopedConsumptions, scopedStatements]);

  const cardName = (id: number) => cards.find((c) => c.id === id)?.name || "(sin tarjeta)";
  const companyShort = (c: string) =>
    c === "General" ? "General" : getCompanyMeta(c as CompanyName)?.short || c;

  // Crear grupo "en el momento" desde el desplegable (igual que en Costos).
  const pickGroupOrCreate = (raw: string, apply: (name: string) => void) => {
    if (raw !== NEW_GROUP_OPTION) {
      apply(raw);
      return;
    }
    const name = (window.prompt("Nombre del grupo nuevo (ej: Publicidad, Software, Combustible):") || "").trim();
    if (!name) return;
    const esFijo = window.confirm(
      `"${name}": ¿es un costo FIJO?\n\nAceptar = FIJO (se repite todos los meses)\nCancelar = VARIABLE`
    );
    const created = createCostGroup(name, esFijo ? "fijo" : "variable");
    if (created) apply(created);
  };

  const proximoPagar = scopedStatements
    .filter((s) => !s.paid)
    .reduce((acc, s) => acc + Number(s.totalArs || 0), 0);

  const cardOptions = (
    <>
      <option value={0}>(elegí tarjeta)</option>
      {scopedCards.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.bank ? ` · ${c.bank}` : ""}
        </option>
      ))}
    </>
  );

  const anchosTarjetas = usePlanillaWidths("tarjetas.listado", { label: 260, col: 130, colCompact: 100 });
  const anchosResumenes = usePlanillaWidths("tarjetas.resumenes", { label: 240, col: 124, colCompact: 94 });

  return (
    <>
      <div style={{ ...styles.sectionNote, marginBottom: 12 }}>
        Las tarjetas sirven para <strong>identificar costos fijos y variables</strong> a partir de los
        consumos, para <strong>cotizar</strong> y preparar los marcadores. <strong>No suman al estado
        de resultados</strong> (el pago del resumen ya sale por el banco; acá es solo el detalle por
        rubro). Pesos y dólares nunca se suman.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>Empresa:</span>
        <select
          style={{ ...styles.input, maxWidth: 260 }}
          value={companyScope}
          onChange={(e) => onScopeChange(e.target.value)}
        >
          <option value="__ALL__">Todas</option>
          {COMPANY_OPTIONS.map((c: any) => (
            <option key={c.value} value={c.value}>
              {c.short}
            </option>
          ))}
        </select>
      </div>

      {/* --- Costos para cotización (fijo/variable) --- */}
      <Panel title="Costos de tarjeta para cotización · fijo / variable" span="full">
        <div style={styles.metricGrid}>
          <MiniMetric label="Fijo $ (mes)" value={money(cardCostSummary.ars.fijo)} />
          <MiniMetric label="Variable $ (mes)" value={money(cardCostSummary.ars.variable)} />
          <MiniMetric label="Total $" value={money(cardCostSummary.ars.total)} />
          {(cardCostSummary.usd.total !== 0) && (
            <>
              <MiniMetric label="Fijo U$S" value={money(cardCostSummary.usd.fijo, "USD")} />
              <MiniMetric label="Variable U$S" value={money(cardCostSummary.usd.variable, "USD")} />
            </>
          )}
        </div>
        {cardCostSummary.byGroup.length === 0 ? (
          <div style={{ ...styles.muted, marginTop: 8 }}>
            Cargá consumos y clasificalos a un grupo para ver el desglose fijo/variable.
          </div>
        ) : (
          <table className="planilla" style={{ ...planillaTable, marginTop: 10 }}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>Grupo</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Total</th>
                <th style={{ ...thFlexible, textAlign: "right" }}>Recurrente / mes</th>
              </tr>
            </thead>
            <tbody>
              {cardCostSummary.byGroup.map((r) => (
                <tr key={`${r.group}-${r.currency}`}>
                  <td style={{ ...tdNombre, fontWeight: 400 }}>
                    <span
                      title={r.kind === "fijo" ? "Costo fijo" : "Costo variable"}
                      style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                        background: r.kind === "fijo" ? "#2563eb" : "#ca8a04",
                      }}
                    />
                    {r.group}
                    {r.currency === "USD" ? " (U$S)" : ""}
                  </td>
                  <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                    {money(r.total, r.currency)}
                  </td>
                  <td style={{ ...tdFlexible, textAlign: "right", color: "#7c3aed" }}>
                    {r.recurringMonthly > 0 ? money(r.recurringMonthly, r.currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 6 }}>
          La columna <strong>Recurrente / mes</strong> junta los consumos marcados como recurrentes: es
          lo que conviene volcar al marcador correspondiente.
        </div>
      </Panel>

      {/* --- Tarjetas --- */}
      <Panel
        title="Tarjetas"
        span="full"
        actions={<ButtonLike onClick={addCreditCard}>Agregar tarjeta</ButtonLike>}
      >
        {scopedCards.length === 0 ? (
          <div style={styles.muted}>No hay tarjetas. Agregá la primera para empezar a cargar consumos.</div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosTarjetas.vars }}>
          <table className="planilla" style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Tarjeta
                  <PlanillaManija
                    onMouseDown={(ev) => anchosTarjetas.startResize(ev, "label")}
                    onDoubleClick={anchosTarjetas.resetLabel}
                  />
                </th>
                <th style={thColumna}>
                  Últimos dígitos
                  <PlanillaManija
                    onMouseDown={(ev) => anchosTarjetas.startResize(ev, "col")}
                    onDoubleClick={anchosTarjetas.resetCol}
                  />
                </th>
                <th style={thFlexible}>Banco · empresa · notas</th>
              </tr>
            </thead>
            <tbody>
              {scopedCards.map((c) => (
                <tr
                  key={c.id}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (window.confirm(`¿Quitar la tarjeta "${c.name}"?`)) removeCreditCard(c.id);
                  }}
                  title="Click derecho: quitar. El punto verde activa o desactiva."
                >
                  <td style={{ ...tdNombre, fontWeight: 400, padding: 0, opacity: c.active ? 1 : 0.45 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                      <span
                        title={c.active ? "Activa" : "Inactiva"}
                        onClick={() => updateCreditCard(c.id, "active", !c.active)}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                          cursor: "pointer", background: c.active ? "#16a34a" : "#cbd5f5",
                        }}
                      />
                      <input
                        style={inputCelda}
                        {...focoCelda}
                        value={c.name}
                        onChange={(e) => updateCreditCard(c.id, "name", e.target.value)}
                      />
                    </span>
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <input
                      style={{ ...inputCelda, padding: "1px 6px" }}
                      {...focoCelda}
                      value={c.lastDigits}
                      onChange={(e) => updateCreditCard(c.id, "lastDigits", e.target.value)}
                    />
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                      <input
                        style={{ ...inputCelda, width: 150 }}
                        {...focoCelda}
                        value={c.bank}
                        placeholder="Santander / Patagonia"
                        onChange={(e) => updateCreditCard(c.id, "bank", e.target.value)}
                      />
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        value={c.company}
                        onChange={(e) => updateCreditCard(c.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((o: any) => (
                          <option key={o.value} value={o.value}>
                            {o.short}
                          </option>
                        ))}
                      </select>
                      <input
                        style={{ ...inputCelda, flex: 1, minWidth: 90, color: "#94a3b8" }}
                        {...focoCelda}
                        value={c.notes}
                        placeholder="notas"
                        onChange={(e) => updateCreditCard(c.id, "notes", e.target.value)}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>

      {/* --- Resúmenes / cierres --- */}
      <Panel
        title="Resúmenes · cierres y vencimientos"
        span="full"
        actions={<ButtonLike onClick={addCreditCardStatement}>Agregar resumen</ButtonLike>}
      >
        <div style={styles.metricGrid}>
          <MiniMetric label="Próximo a pagar (sin pagar)" value={money(proximoPagar)} />
          <MiniMetric label="Resúmenes cargados" value={String(scopedStatements.length)} />
        </div>
        {scopedStatements.length === 0 ? (
          <div style={{ ...styles.muted, marginTop: 8 }}>
            Cargá los cierres para ver vencimientos y cuánto se viene a pagar.
          </div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosResumenes.vars, marginTop: 10 }}>
          <table className="planilla" style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Tarjeta · cierre
                  <PlanillaManija
                    onMouseDown={(ev) => anchosResumenes.startResize(ev, "label")}
                    onDoubleClick={anchosResumenes.resetLabel}
                  />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Total $
                  <PlanillaManija
                    onMouseDown={(ev) => anchosResumenes.startResize(ev, "col")}
                    onDoubleClick={anchosResumenes.resetCol}
                  />
                </th>
                <th style={thColumna}>Vencimiento</th>
                <th style={thFlexible}>Total U$S · pago mínimo</th>
              </tr>
            </thead>
            <tbody>
              {scopedStatements.map((s) => (
                <tr
                  key={s.id}
                  style={s.paid ? { opacity: 0.55 } : undefined}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (window.confirm("¿Quitar este resumen?")) removeCreditCardStatement(s.id);
                  }}
                  title="Click derecho: quitar. El punto verde marca el resumen como pagado."
                >
                  <td style={{ ...tdNombre, fontWeight: 400, padding: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                      <span
                        title={s.paid ? "Pagado" : "Sin pagar"}
                        onClick={() => updateCreditCardStatement(s.id, "paid", !s.paid)}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                          cursor: "pointer", background: s.paid ? "#16a34a" : "#ca8a04",
                        }}
                      />
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        value={s.cardId}
                        onChange={(e) => updateCreditCardStatement(s.id, "cardId", Number(e.target.value))}
                      >
                        {cardOptions}
                      </select>
                      <input
                        style={{ ...inputCelda, width: 120 }}
                        {...focoCelda}
                        type="date"
                        value={s.closingDate}
                        onChange={(e) => updateCreditCardStatement(s.id, "closingDate", e.target.value)}
                      />
                    </span>
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <AmountInput
                      style={inputCeldaDerecha}
                      {...focoCelda}
                      value={s.totalArs}
                      onChange={(n) => updateCreditCardStatement(s.id, "totalArs", n)}
                    />
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <input
                      style={{ ...inputCelda, padding: "1px 6px" }}
                      {...focoCelda}
                      type="date"
                      value={s.dueDate}
                      onChange={(e) => updateCreditCardStatement(s.id, "dueDate", e.target.value)}
                    />
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                      <span style={{ color: "#94a3b8" }}>U$S</span>
                      <AmountInput
                        style={{ ...inputCelda, width: 110, textAlign: "right" }}
                        {...focoCelda}
                        value={s.totalUsd}
                        onChange={(n) => updateCreditCardStatement(s.id, "totalUsd", n)}
                      />
                      <span style={{ color: "#94a3b8" }}>pago mín.</span>
                      <AmountInput
                        style={{ ...inputCelda, width: 110, textAlign: "right" }}
                        {...focoCelda}
                        value={s.minPaymentArs}
                        onChange={(n) => updateCreditCardStatement(s.id, "minPaymentArs", n)}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>

      {/* --- Consumos: PLANILLA por cierre (misma estetica que el Calendario anual) --- */}
      <Panel
        title="Consumos · planilla por cierre"
        span="full"
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ButtonLike onClick={anchos.toggleCompacto} secondary>
              {anchos.esCompacto ? "Ancho normal" : "Compacto"}
            </ButtonLike>
            <ButtonLike onClick={addCreditCardConsumption}>Agregar consumo</ButtonLike>
          </div>
        }
      >
        {scopedConsumptions.length === 0 ? (
          <div style={styles.muted}>
            No hay consumos. Al clasificar cada consumo a un grupo, el sistema aprende la regla y el
            proximo consumo del mismo concepto se sugiere solo.
          </div>
        ) : (
          <>
            <div style={{ ...styles.sectionNote, marginBottom: 8 }}>
              Cada cierre es una seccion: tocá el titulo para plegarla. El <strong>total del cierre</strong>{" "}
              se compara con el saldo del resumen del banco; si coinciden, esta bien cargado.{" "}
              <strong>Boton derecho</strong> sobre cualquier fila para clasificarla, marcarla recurrente,
              editarla o borrarla.
            </div>
            <div style={{ ...planillaWrap, ...anchos.vars }}>
              <table className="planilla" style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thEsquina, position: "sticky" }}>
                      Descripcion
                        <PlanillaManija
                          onMouseDown={(ev) => anchos.startResize(ev, "label")}
                          onDoubleClick={anchos.resetLabel}
                        />
                    </th>
                    <th style={thColumna}>Fecha</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Monto
                        <PlanillaManija
                          onMouseDown={(ev) => anchos.startResize(ev, "col")}
                          onDoubleClick={anchos.resetCol}
                        />
                    </th>
                    <th style={thColumna}>Grupo (fijo/var)</th>
                    <th style={thColumna}>Cuota</th>
                    <th style={thFlexible}>Tarjeta</th>
                  </tr>
                </thead>
                <tbody>
                  {bloques.cierres.map(({ st, compras, cargos, total, difiere }) => {
                    const plegado = cerrados.has(st.id);
                    const fila = (c: CreditCardConsumption, sangria: number) => (
                      <tr key={c.id} onContextMenu={(ev) => abrirMenu(ev, c.id)}>
                        <td style={{ ...tdNombre, paddingLeft: sangria, fontWeight: 400 }} title={c.description}>
                          {c.description || "(sin descripcion)"}
                        </td>
                        <td style={{ ...tdDato, color: "#64748b" }}>{formatDateDisplay(c.date)}</td>
                        <td style={{ ...tdDato, textAlign: "right", color: "#dc2626" }}>
                          {money(c.amount, c.currency)}
                        </td>
                        <td style={tdDato}>
                          {c.group ? (
                            <span style={chipGrupo}>{c.group}</span>
                          ) : (
                            <span style={pillFalta} title="Falta clasificar a un grupo">D</span>
                          )}
                        </td>
                        <td style={{ ...tdDato, color: "#64748b" }}>{c.installments || "—"}</td>
                        <td style={{ ...tdFlexible, color: "#64748b" }} title={c.notes}>
                          {(c.notes || "").match(/Tarjeta (\d{4})/)?.[1] || "—"}
                        </td>
                      </tr>
                    );
                    return (
                      <React.Fragment key={st.id}>
                        <tr>
                          <td
                            onClick={() => plegar(st.id)}
                            title="Tocá para plegar o desplegar este cierre"
                            style={{ ...tdNombre, background: "#e0f2fe", fontWeight: 800, color: "#075985", cursor: "pointer", userSelect: "none" }}
                          >
                            {plegado ? "▸ " : "▾ "}Cierre {formatDateDisplay(st.closingDate)}
                          </td>
                          <td style={{ ...tdDato, background: "#e0f2fe", color: "#075985" }}>
                            vence {formatDateDisplay(st.dueDate)}
                          </td>
                          <td style={{ ...tdDato, background: "#e0f2fe", textAlign: "right", fontWeight: 800, color: "#075985" }}>
                            {money(total)}
                          </td>
                          <td colSpan={3} style={{ ...tdDato, background: "#e0f2fe", color: difiere ? "#b45309" : "#166534" }}>
                            {difiere
                              ? `⚠ el resumen dice ${money(st.totalArs)} · difiere ${money(Math.abs(total - Number(st.totalArs || 0)))}`
                              : `✓ coincide con el resumen (${money(st.totalArs)})`}
                          </td>
                        </tr>
                        {!plegado && compras.map((c) => fila(c, 24))}
                        {!plegado && cargos.length > 0 && (
                          <tr>
                            <td style={{ ...tdNombre, paddingLeft: 24, background: "#f8fafc", fontWeight: 500, color: "#64748b" }}>
                              Cargos del resumen
                            </td>
                            <td colSpan={5} style={{ ...tdDato, background: "#f8fafc", color: "#94a3b8" }}>
                              sellos, comisiones e IVA del cierre
                            </td>
                          </tr>
                        )}
                        {!plegado && cargos.map((c) => fila(c, 38))}
                      </React.Fragment>
                    );
                  })}
                  {bloques.sueltos.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={6} style={{ ...tdNombre, background: "#fef9c3", fontWeight: 800, color: "#854d0e", width: "auto", maxWidth: "none" }}>
                          Sin resumen asignado
                        </td>
                      </tr>
                      {bloques.sueltos.map((c) => (
                        <tr key={c.id} onContextMenu={(ev) => abrirMenu(ev, c.id)}>
                          <td style={{ ...tdNombre, paddingLeft: 24, fontWeight: 400 }} title={c.description}>
                            {c.description || "(sin descripcion)"}
                          </td>
                          <td style={{ ...tdDato, color: "#64748b" }}>{formatDateDisplay(c.date)}</td>
                          <td style={{ ...tdDato, textAlign: "right", color: "#dc2626" }}>
                            {money(c.amount, c.currency)}
                          </td>
                          <td style={tdDato}>
                            {c.group ? <span style={chipGrupo}>{c.group}</span> : <span style={pillFalta}>D</span>}
                          </td>
                          <td style={{ ...tdDato, color: "#64748b" }}>{c.installments || "—"}</td>
                          <td style={{ ...tdFlexible, color: "#64748b" }} title={c.notes}>
                            {(c.notes || "").match(/Tarjeta (\d{4})/)?.[1] || "—"}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {menu && (() => {
        const c = scopedConsumptions.find((x) => x.id === menu.id);
        const cerrar = () => setMenu(null);
        if (!c) return null;
        return (
          <QuickMenu x={menu.x} y={menu.y} onClose={cerrar}>
            <QuickMenuTitle>
              {c.description || "consumo"} · {money(c.amount, c.currency)}
            </QuickMenuTitle>
            <div style={{ fontSize: 11, color: "#64748b", padding: "2px 8px" }}>Clasificar a un grupo</div>
            {manualGroupOptions.map((g) => (
              <button
                key={g}
                style={{ ...quickMenuItem, fontWeight: c.group === g ? 800 : 500 }}
                onClick={() => {
                  updateCreditCardConsumption(c.id, "group", g);
                  cerrar();
                }}
              >
                {g}
              </button>
            ))}
            <button
              style={quickMenuItem}
              onClick={() => {
                pickGroupOrCreate(NEW_GROUP_OPTION, (name) =>
                  updateCreditCardConsumption(c.id, "group", name)
                );
                cerrar();
              }}
            >
              Crear grupo nuevo…
            </button>
            {c.group && (
              <button
                style={quickMenuItem}
                onClick={() => {
                  updateCreditCardConsumption(c.id, "group", "");
                  cerrar();
                }}
              >
                Sacar del grupo
              </button>
            )}
            <QuickMenuSep />
            <button
              style={quickMenuItem}
              onClick={() => {
                updateCreditCardConsumption(c.id, "recurring", !c.recurring);
                cerrar();
              }}
            >
              {c.recurring ? "Ya no es recurrente" : "Marcar como recurrente (todos los meses)"}
            </button>
            <button
              style={quickMenuItem}
              onClick={() => {
                const v = window.prompt("Descripcion:", c.description || "");
                if (v !== null) updateCreditCardConsumption(c.id, "description", v.trim());
                cerrar();
              }}
            >
              Editar descripcion…
            </button>
            <button
              style={quickMenuItem}
              onClick={() => {
                const v = window.prompt("Monto:", String(c.amount ?? ""));
                const n = Number((v || "").replace(",", "."));
                if (v !== null && Number.isFinite(n)) updateCreditCardConsumption(c.id, "amount", n);
                cerrar();
              }}
            >
              Editar monto…
            </button>
            <QuickMenuSep />
            <button
              style={{ ...quickMenuItem, color: "#b91c1c" }}
              onClick={() => {
                if (window.confirm(`¿Borrar "${c.description}" por ${money(c.amount, c.currency)}?`)) {
                  removeCreditCardConsumption(c.id);
                }
                cerrar();
              }}
            >
              Borrar consumo
            </button>
          </QuickMenu>
        );
      })()}
    </>
  );
}

// Chip del grupo de costo y pill "D" de falta clasificar (misma convencion que el resto del sistema).
const chipGrupo: React.CSSProperties = {
  display: "inline-block", background: "#e0e7ff", color: "#3730a3", fontWeight: 700,
  fontSize: 10, borderRadius: 4, padding: "1px 6px", maxWidth: "100%", overflow: "hidden",
  textOverflow: "ellipsis", verticalAlign: "middle",
};
const pillFalta: React.CSSProperties = {
  display: "inline-block", background: "#fef3c7", color: "#92400e", fontWeight: 800,
  fontSize: 10, borderRadius: 999, padding: "1px 7px", verticalAlign: "middle",
};

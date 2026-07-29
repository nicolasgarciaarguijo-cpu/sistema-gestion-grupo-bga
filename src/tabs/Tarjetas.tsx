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
          <table style={{ ...styles.table, marginTop: 10 }}>
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Tipo</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>Recurrente / mes</th>
              </tr>
            </thead>
            <tbody>
              {cardCostSummary.byGroup.map((r) => (
                <tr key={`${r.group}-${r.currency}`}>
                  <td>
                    {r.group}
                    {r.currency === "USD" ? " (U$S)" : ""}
                  </td>
                  <td>{r.kind === "fijo" ? "Fijo" : "Variable"}</td>
                  <td style={{ textAlign: "right" }}>{money(r.total, r.currency)}</td>
                  <td style={{ textAlign: "right", color: "#7c3aed" }}>
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
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Activa</th>
                <th>Empresa</th>
                <th>Nombre</th>
                <th>Banco</th>
                <th>Últimos dígitos</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scopedCards.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={(e) => updateCreditCard(c.id, "active", e.target.checked)}
                    />
                  </td>
                  <td>
                    <select
                      style={styles.input}
                      value={c.company}
                      onChange={(e) => updateCreditCard(c.id, "company", e.target.value)}
                    >
                      {COMPANY_OPTIONS.map((o: any) => (
                        <option key={o.value} value={o.value}>
                          {o.short}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      value={c.name}
                      onChange={(e) => updateCreditCard(c.id, "name", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      value={c.bank}
                      placeholder="Santander / Patagonia"
                      onChange={(e) => updateCreditCard(c.id, "bank", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      style={{ ...styles.input, maxWidth: 90 }}
                      value={c.lastDigits}
                      onChange={(e) => updateCreditCard(c.id, "lastDigits", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      value={c.notes}
                      onChange={(e) => updateCreditCard(c.id, "notes", e.target.value)}
                    />
                  </td>
                  <td>
                    <button style={styles.smallBtn} onClick={() => removeCreditCard(c.id)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <table style={{ ...styles.table, marginTop: 10 }}>
            <thead>
              <tr>
                <th>Tarjeta</th>
                <th>Cierre</th>
                <th>Vencimiento</th>
                <th style={{ textAlign: "right" }}>Total $</th>
                <th style={{ textAlign: "right" }}>Total U$S</th>
                <th style={{ textAlign: "right" }}>Pago mín. $</th>
                <th>Pagado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scopedStatements.map((s) => (
                <tr key={s.id} style={s.paid ? { opacity: 0.55 } : undefined}>
                  <td>
                    <select
                      style={styles.input}
                      value={s.cardId}
                      onChange={(e) => updateCreditCardStatement(s.id, "cardId", Number(e.target.value))}
                    >
                      {cardOptions}
                    </select>
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      type="date"
                      value={s.closingDate}
                      onChange={(e) => updateCreditCardStatement(s.id, "closingDate", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      type="date"
                      value={s.dueDate}
                      onChange={(e) => updateCreditCardStatement(s.id, "dueDate", e.target.value)}
                    />
                  </td>
                  <td>
                    <AmountInput
                      style={styles.input}
                      value={s.totalArs}
                      onChange={(n) => updateCreditCardStatement(s.id, "totalArs", n)}
                    />
                  </td>
                  <td>
                    <AmountInput
                      style={styles.input}
                      value={s.totalUsd}
                      onChange={(n) => updateCreditCardStatement(s.id, "totalUsd", n)}
                    />
                  </td>
                  <td>
                    <AmountInput
                      style={styles.input}
                      value={s.minPaymentArs}
                      onChange={(n) => updateCreditCardStatement(s.id, "minPaymentArs", n)}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={s.paid}
                      onChange={(e) => updateCreditCardStatement(s.id, "paid", e.target.checked)}
                    />
                  </td>
                  <td>
                    <button style={styles.smallBtn} onClick={() => removeCreditCardStatement(s.id)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* --- Consumos --- */}
      <Panel
        title="Consumos · clasificados por rubro (para cotizar)"
        span="full"
        actions={<ButtonLike onClick={addCreditCardConsumption}>Agregar consumo</ButtonLike>}
      >
        {scopedConsumptions.length === 0 ? (
          <div style={styles.muted}>
            No hay consumos. Al clasificar cada consumo a un grupo, el sistema aprende la regla y el
            próximo consumo del mismo concepto se sugiere solo.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Tarjeta</th>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Moneda</th>
                <th style={{ textAlign: "right" }}>Monto</th>
                <th>Grupo (fijo/var)</th>
                <th>Cuotas</th>
                <th>Recurrente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scopedConsumptions.map((c) => (
                <tr key={c.id}>
                  <td>
                    <select
                      style={styles.input}
                      value={c.cardId}
                      onChange={(e) =>
                        updateCreditCardConsumption(c.id, "cardId", Number(e.target.value))
                      }
                    >
                      {cardOptions}
                    </select>
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      type="date"
                      value={c.date}
                      onChange={(e) => updateCreditCardConsumption(c.id, "date", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      value={c.description}
                      placeholder="Ej: Google Ads, Netflix, YPF..."
                      onChange={(e) =>
                        updateCreditCardConsumption(c.id, "description", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <select
                      style={styles.input}
                      value={c.currency}
                      onChange={(e) => updateCreditCardConsumption(c.id, "currency", e.target.value)}
                    >
                      <option value="ARS">$ Pesos</option>
                      <option value="USD">U$S Dólares</option>
                    </select>
                  </td>
                  <td>
                    <AmountInput
                      style={styles.input}
                      value={c.amount}
                      onChange={(n) => updateCreditCardConsumption(c.id, "amount", n)}
                    />
                  </td>
                  <td>
                    <select
                      style={styles.input}
                      value={c.group}
                      onChange={(e) =>
                        pickGroupOrCreate(e.target.value, (name) =>
                          updateCreditCardConsumption(c.id, "group", name)
                        )
                      }
                    >
                      <option value="">Sin clasificar</option>
                      {manualGroupOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                      <option value={NEW_GROUP_OPTION}>➕ Crear grupo nuevo…</option>
                    </select>
                  </td>
                  <td>
                    <input
                      style={{ ...styles.input, maxWidth: 70 }}
                      value={c.installments}
                      placeholder="3/12"
                      onChange={(e) =>
                        updateCreditCardConsumption(c.id, "installments", e.target.value)
                      }
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={c.recurring}
                      title="Se repite todos los meses (insumo del marcador)"
                      onChange={(e) =>
                        updateCreditCardConsumption(c.id, "recurring", e.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <button style={styles.smallBtn} onClick={() => removeCreditCardConsumption(c.id)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

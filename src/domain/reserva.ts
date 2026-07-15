// La RESERVA es la billetera de la empresa: la plata que hay.
//
// Sube cuando cobran y baja cuando pagan; lo que queda es el excedente. Sacar plata de la reserva
// NO es un ingreso (esa plata ya era de la empresa), por eso la reserva NO toca el estado de
// resultados: solo balance y cash flow. Resultados dice si el ejercicio fue bueno; la reserva dice
// cuanta plata hay en la mano.
//
// Cuatro billeteras, como en las planillas reales: pesos/dolares x banco/efectivo. Pesos y dolares
// NUNCA se suman: son dos totales que conviven, sin cotizacion de por medio. Un pasaje de $ a USD
// se carga como dos movimientos (egreso en una billetera, ingreso en la otra) marcados isTransfer:
// la cotizacion queda implicita y no hay que guardarla ni mantenerla.
//
// El color (blanco/negro) es INDEPENDIENTE de la ubicacion: puede haber plata blanca fuera del
// banco (caja de seguridad). Ese cruce es justo lo que las planillas no distinguen.

export type ReservaCurrency = "ARS" | "USD";
export type ReservaLocation = "banco" | "efectivo";
export type ReservaColor = "blanco" | "negro";
export type ReservaKind = "ingreso" | "egreso";

export type ReservaOpening = {
  currency: ReservaCurrency;
  location: ReservaLocation;
  color: ReservaColor;
  amount: number;
};

export type ReservaMovementInput = {
  date: string; // "yyyy-mm-dd"
  currency: ReservaCurrency;
  location: ReservaLocation;
  color: ReservaColor;
  kind: ReservaKind;
  amount: number;
  // Pasaje entre billeteras: mueve el saldo pero NO cuenta como ingreso/egreso de la empresa.
  isTransfer?: boolean;
};

export type ReservaColorBalance = {
  opening: number;
  ingresos: number;
  egresos: number;
  closing: number;
};

export type ReservaWalletBalance = ReservaColorBalance & {
  currency: ReservaCurrency;
  location: ReservaLocation;
  byColor: Record<ReservaColor, ReservaColorBalance>;
  negative: boolean; // el usuario quiere saber, sobre todo, que no este en rojo
};

export type ReservaCurrencyTotal = ReservaColorBalance & {
  currency: ReservaCurrency;
  byColor: Record<ReservaColor, ReservaColorBalance>;
  negative: boolean;
};

export type ReservaSummary = {
  wallets: ReservaWalletBalance[]; // siempre las 4, en orden fijo
  totals: ReservaCurrencyTotal[]; // uno por moneda: ARS y USD. NUNCA un total unico.
};

export const RESERVA_WALLETS: Array<{ currency: ReservaCurrency; location: ReservaLocation }> = [
  { currency: "ARS", location: "banco" },
  { currency: "ARS", location: "efectivo" },
  { currency: "USD", location: "banco" },
  { currency: "USD", location: "efectivo" },
];

export const RESERVA_COLORS: ReservaColor[] = ["blanco", "negro"];

const emptyColorBalance = (): ReservaColorBalance => ({
  opening: 0,
  ingresos: 0,
  egresos: 0,
  closing: 0,
});

const walletKey = (currency: ReservaCurrency, location: ReservaLocation) => `${currency}|${location}`;

const num = (value: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Suma dos balances (para totalizar por moneda o por billetera).
const addInto = (target: ReservaColorBalance, source: ReservaColorBalance) => {
  target.opening += source.opening;
  target.ingresos += source.ingresos;
  target.egresos += source.egresos;
  target.closing += source.closing;
};

export function aggregateReserva(input: {
  openings: ReservaOpening[];
  movements: ReservaMovementInput[];
  // Corte opcional: solo movimientos con date <= until (inclusive). El opening no se filtra.
  until?: string;
}): ReservaSummary {
  const { openings, movements, until } = input;

  // Acumulador: billetera -> color -> balance
  const acc = new Map<string, Record<ReservaColor, ReservaColorBalance>>();
  RESERVA_WALLETS.forEach(({ currency, location }) => {
    acc.set(walletKey(currency, location), {
      blanco: emptyColorBalance(),
      negro: emptyColorBalance(),
    });
  });

  openings.forEach((opening) => {
    const bucket = acc.get(walletKey(opening.currency, opening.location));
    if (!bucket) return; // billetera desconocida: se ignora en vez de romper
    bucket[opening.color].opening += num(opening.amount);
  });

  movements.forEach((movement) => {
    if (until && movement.date > until) return;
    const bucket = acc.get(walletKey(movement.currency, movement.location));
    if (!bucket) return;
    const amount = num(movement.amount);
    if (amount <= 0) return; // montos <= 0 o invalidos no mueven nada
    const balance = bucket[movement.color];
    if (!balance) return;
    // Los pasajes mueven el saldo pero no cuentan como ingreso/egreso de la empresa.
    if (!movement.isTransfer) {
      if (movement.kind === "ingreso") balance.ingresos += amount;
      else balance.egresos += amount;
    }
    balance.closing += movement.kind === "ingreso" ? amount : -amount;
  });

  const wallets: ReservaWalletBalance[] = RESERVA_WALLETS.map(({ currency, location }) => {
    const bucket = acc.get(walletKey(currency, location)) as Record<ReservaColor, ReservaColorBalance>;
    const byColor = {} as Record<ReservaColor, ReservaColorBalance>;
    const total = emptyColorBalance();

    RESERVA_COLORS.forEach((color) => {
      const source = bucket[color];
      // closing acumulo solo los movimientos; hay que sumarle el saldo inicial.
      const resolved: ReservaColorBalance = {
        opening: source.opening,
        ingresos: source.ingresos,
        egresos: source.egresos,
        closing: source.opening + source.closing,
      };
      byColor[color] = resolved;
      addInto(total, resolved);
    });

    return {
      currency,
      location,
      ...total,
      byColor,
      negative: total.closing < 0,
    };
  });

  const totals: ReservaCurrencyTotal[] = (["ARS", "USD"] as ReservaCurrency[]).map((currency) => {
    const total = emptyColorBalance();
    const byColor = {} as Record<ReservaColor, ReservaColorBalance>;
    RESERVA_COLORS.forEach((color) => (byColor[color] = emptyColorBalance()));

    wallets
      .filter((wallet) => wallet.currency === currency)
      .forEach((wallet) => {
        addInto(total, wallet);
        RESERVA_COLORS.forEach((color) => addInto(byColor[color], wallet.byColor[color]));
      });

    return { currency, ...total, byColor, negative: total.closing < 0 };
  });

  return { wallets, totals };
}

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatAmountInput, formatAmountTyping, parseAmountInput } from "../lib/format";

// CAMPO NUMERICO CON MILES MIENTRAS SE ESCRIBE (Nicolas, 2026-10-20): "a la hora de cargar numeros quiero
// ver los puntos de separacion de miles y millones mientras voy escribiendo, asi es mas sencillo no
// cometer errores". Reemplaza a <input type="number"> en todo el sistema SIN tocar los handlers: el
// onChange recibe un evento cuyo target.value es el numero crudo ("1250000.5"), igual que antes.
//
// Formato es-AR: miles con "." y decimal con ",". El "." tipeado al final (teclado numerico) se toma
// como coma decimal. Admite negativos. El cursor queda en el mismo lugar respecto de los digitos.

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value"> & {
  value?: number | string | null;
};

const crudo = (texto: string): string => {
  const neg = texto.trim().startsWith("-");
  const sinSigno = texto.replace(/-/g, "");
  if (!/\d/.test(sinSigno)) return "";
  const n = parseAmountInput(sinSigno);
  return String(neg ? -n : n);
};

const mostrar = (v: Props["value"]): string => {
  if (v === "" || v == null) return "";
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return v === 0 || v === "0" ? "0" : "";
  return `${n < 0 ? "-" : ""}${formatAmountInput(Math.abs(n))}`;
};

const formatear = (tipeado: string): string => {
  const neg = tipeado.trim().startsWith("-");
  let t = tipeado.replace(/-/g, "");
  // Teclado numerico: un "." recien tipeado al final, sin coma todavia, es la coma decimal.
  if (!t.includes(",") && /\.$/.test(t)) t = `${t.slice(0, -1)},`;
  const f = formatAmountTyping(t);
  return neg ? `-${f}` : f;
};

// Cuantos digitos (y coma) hay a la derecha de una posicion: es lo que se conserva al reformatear.
const aLaDerecha = (texto: string, pos: number) => texto.slice(pos).replace(/[^\d,]/g, "").length;

export default function NumInput({ value, onChange, onFocus, onBlur, inputMode, ...rest }: Props) {
  const [texto, setTexto] = useState<string>(() => mostrar(value));
  const [editando, setEditando] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | null>(null);

  // Cambio desde afuera (carga, reset) mientras no se edita: se refresca el texto.
  useEffect(() => {
    if (!editando) setTexto(mostrar(value));
  }, [value, editando]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || cursor.current == null || document.activeElement !== el) return;
    // Ubicar el cursor para que queden los mismos digitos a su derecha.
    let pos = texto.length;
    let restantes = cursor.current;
    while (pos > 0 && restantes > 0) {
      pos -= 1;
      if (/[\d,]/.test(texto[pos])) restantes -= 1;
    }
    el.setSelectionRange(pos, pos);
    cursor.current = null;
  }, [texto]);

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode={inputMode || "decimal"}
      value={texto}
      onFocus={(e) => {
        setEditando(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setEditando(false);
        setTexto(mostrar(value));
        onBlur?.(e);
      }}
      onChange={(e) => {
        const tipeado = e.target.value;
        cursor.current = aLaDerecha(tipeado, e.target.selectionStart ?? tipeado.length);
        setTexto(formatear(tipeado));
        if (!onChange) return;
        const v = crudo(tipeado);
        // El handler de siempre lee e.target.value: le llega el numero crudo, sin puntos.
        // El resto (name, dataset...) sale del input de verdad.
        const conValor = (el: HTMLInputElement) =>
          new Proxy(el, {
            get: (t, p) => {
              if (p === "value") return v;
              const x = (t as any)[p];
              return typeof x === "function" ? x.bind(t) : x;
            },
          });
        const evento = { ...e, target: conValor(e.target), currentTarget: conValor(e.currentTarget) };
        onChange(evento as unknown as React.ChangeEvent<HTMLInputElement>);
      }}
    />
  );
}

// Generación de IDs de ítems. Reemplaza a `Date.now()` (que colisiona si dos usuarios
// crean un ítem en el mismo milisegundo) por un entero aleatorio criptográfico de 53 bits
// (entero seguro de JS). Mantiene el id NUMÉRICO (sin cambiar tipos) y un espacio de
// ~9·10^15 con aleatoriedad cripto, así las colisiones son astronómicamente improbables.
// Fallback (sin Web Crypto): base aleatoria por proceso + contador monotónico, así nunca
// colisiona dentro de una sesión y la base random evita choques entre procesos.
const fallbackBase = Math.floor(Math.random() * 0x100000000000); // ~2^44
let fallbackSeq = 0;

export const newId = (): number => {
  const cryptoObj =
    typeof globalThis !== "undefined"
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buf = new Uint32Array(2);
    cryptoObj.getRandomValues(buf);
    // 53 bits = 32 (buf[0]) + 21 (bits altos de buf[1]).
    return buf[0] * 0x200000 + (buf[1] >>> 11);
  }
  fallbackSeq += 1;
  return fallbackBase + fallbackSeq;
};

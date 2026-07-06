// Extraccion de texto de un PDF en el navegador SIN librerias externas: descomprime los streams
// (FlateDecode = deflate) con la API nativa DecompressionStream (Chrome/Edge) y junta los strings de
// los operadores de texto. No es un render completo, pero alcanza para leer tablas como la escala.

// latin1: cada byte -> un char, asi los indices de string == indices de byte (para cortar los streams).
const decodeLatin1 = (bytes: Uint8Array): string => new TextDecoder("latin1").decode(bytes);

const concatChunks = (chunks: Uint8Array[]): Uint8Array => {
  let len = 0;
  chunks.forEach((c) => (len += c.length));
  const out = new Uint8Array(len);
  let offset = 0;
  chunks.forEach((c) => {
    out.set(c, offset);
    offset += c.length;
  });
  return out;
};

// Inflar un chunk deflate con DecompressionStream. Lee la salida a mano y CONSERVA lo ya
// descomprimido aunque el stream tire error al final por bytes de mas (el PDF agrega un salto de
// linea antes de "endstream"; DecompressionStream es estricto y node no). Prueba zlib y crudo.
async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  const DS: any = (globalThis as any).DecompressionStream;
  if (!DS) return null;
  for (const format of ["deflate", "deflate-raw"]) {
    try {
      const ds = new DS(format);
      const writer = ds.writable.getWriter();
      writer.write(bytes).catch(() => {});
      writer.close().catch(() => {});
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } catch {
        // bytes de mas al final: nos quedamos con lo ya descomprimido (contenido util completo)
      }
      if (chunks.length > 0) return concatChunks(chunks);
    } catch {
      // formato incorrecto: probar el siguiente
    }
  }
  return null;
}

export function isPdfExtractionSupported(): boolean {
  return typeof (globalThis as any).DecompressionStream === "function";
}

// Devuelve el texto crudo del PDF: la concatenacion de los strings entre parentesis de los operadores
// de texto (Tj/TJ), unidos por espacio. Es lo que consume parseScaleFromRawText.
export async function extractPdfRawText(file: File): Promise<string> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const latin1 = decodeLatin1(raw);

  const strings: string[] = [];
  let idx = 0;
  const STREAM = "stream";
  const ENDSTREAM = "endstream";

  while (true) {
    const s = latin1.indexOf(STREAM, idx);
    if (s < 0) break;
    let dataStart = s + STREAM.length;
    // el keyword stream va seguido de CRLF o LF
    if (raw[dataStart] === 13) dataStart += 1;
    if (raw[dataStart] === 10) dataStart += 1;
    const e = latin1.indexOf(ENDSTREAM, dataStart);
    if (e < 0) break;

    const chunk = raw.slice(dataStart, e);
    const inflated = await inflate(chunk);
    if (inflated) {
      const text = decodeLatin1(inflated);
      const matches = Array.from(text.matchAll(/\(((?:[^()\\]|\\.)*)\)/g));
      matches.forEach((m) => {
        const val = m[1].replace(/\\([()\\])/g, "$1");
        if (val.trim()) strings.push(val);
      });
    }
    idx = e + ENDSTREAM.length;
  }

  return strings.join(" ");
}

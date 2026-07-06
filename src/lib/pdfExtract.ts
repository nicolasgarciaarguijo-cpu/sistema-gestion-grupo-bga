// Extraccion de texto de un PDF en el navegador SIN librerias externas: descomprime los streams
// (FlateDecode = deflate) con la API nativa DecompressionStream (Chrome/Edge) y junta los strings de
// los operadores de texto. No es un render completo, pero alcanza para leer tablas como la escala.

// latin1: cada byte -> un char, asi los indices de string == indices de byte (para cortar los streams).
const decodeLatin1 = (bytes: Uint8Array): string => new TextDecoder("latin1").decode(bytes);

// Inflar un chunk deflate con DecompressionStream. Prueba zlib ("deflate") y crudo ("deflate-raw").
async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  const DS: any = (globalThis as any).DecompressionStream;
  if (!DS) return null;
  for (const format of ["deflate", "deflate-raw"]) {
    try {
      const stream = new Blob([bytes as any]).stream().pipeThrough(new DS(format));
      const buffer = await new Response(stream).arrayBuffer();
      return new Uint8Array(buffer);
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

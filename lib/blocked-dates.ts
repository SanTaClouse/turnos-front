import type { BlockedSlot } from "@/types/api";

/**
 * Expande los bloqueos de "día completo + todos los recursos" en un Set
 * de fechas ISO (YYYY-MM-DD). Sirve para grisar el calendario sin pegarle
 * al endpoint de slots día por día.
 *
 * Un día queda "totalmente bloqueado" sólo si existe un BlockedSlot con:
 *  - resource_id === null (afecta a todo el tenant)
 *  - start_time === null && end_time === null (sin franja horaria)
 *  - la fecha cae dentro de [date, end_date ?? date]
 *
 * Bloqueos por recurso o con rango horario NO grisan el día: dejamos que
 * /availability/slots devuelva las horas posibles y el usuario vea ahí
 * que el rango bloqueado no está.
 */
export function expandFullDayBlocks(blocks: BlockedSlot[]): Set<string> {
  const out = new Set<string>();
  for (const b of blocks) {
    if (b.resource_id) continue;
    if (b.start_time || b.end_time) continue;
    const start = b.date;
    const end = b.end_date ?? b.date;

    // Iteramos por días en UTC para no shiftear por timezone del server.
    const startMs = Date.UTC(
      Number(start.slice(0, 4)),
      Number(start.slice(5, 7)) - 1,
      Number(start.slice(8, 10)),
    );
    const endMs = Date.UTC(
      Number(end.slice(0, 4)),
      Number(end.slice(5, 7)) - 1,
      Number(end.slice(8, 10)),
    );
    for (let ms = startMs; ms <= endMs; ms += 24 * 60 * 60 * 1000) {
      out.add(new Date(ms).toISOString().slice(0, 10));
    }
  }
  return out;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { getFrontendDomain, getFrontendUrl } from "@/lib/config";
import { addDays, todayInTimezone } from "@/lib/timezone-utils";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Cuántos días ofrece el selector, contando hoy. */
const DAY_OPTIONS = 7;

/** Cabecera que manda la ruta de la historia con los turnos libres del día. */
const FREE_HEADER = "x-free-slots";

/** "Hoy", "Mañana" o "Vie 17". */
function chipLabel(date: string, today: string): string {
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  const [y, m, d] = date.split("-").map(Number);
  // Mediodía UTC: evita que el cambio de huso corra el día uno para atrás.
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return `${DAYS[dow]} ${d}`;
}

/**
 * Compartir la agenda de un día como historia de Instagram.
 *
 * Por qué hay un preview y no un botón directo a `navigator.share`:
 *
 * 1. iOS/Safari exige que `share()` se llame dentro del gesto del usuario. Un
 *    `await fetch()` de la imagen en el medio rompe el gesto y tira
 *    NotAllowedError. Con el preview, la imagen ya está en memoria cuando el
 *    dueño toca "Compartir" — el gesto llega intacto.
 * 2. El dueño elige el día y ve exactamente qué va a publicar.
 */
export function StoryShareButton({
  slug,
  timezone,
}: {
  slug: string;
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = `${getFrontendUrl()}/${slug}`;

  // Copiar es best-effort: sin permiso de portapapeles el sheet igual muestra
  // el link para copiarlo a mano.
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [link]);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          // Se copia acá, dentro del gesto del tap, y NO cuando termina de
          // generarse la imagen: después de un `await` iOS ya no considera la
          // acción iniciada por el usuario y clipboard.writeText() falla con
          // NotAllowedError. El link no depende de la imagen, así que no hay
          // razón para esperarla.
          void copyLink();
        }}
        className="press-fx w-[40px] h-[40px] rounded-full bg-surface border border-line flex items-center justify-center"
        aria-label="Compartir turnos libres en una historia"
        title="Compartir turnos libres"
      >
        <Icon name="image" size={18} color="var(--ink-1)" />
      </button>

      <StoryShareSheet
        slug={slug}
        timezone={timezone}
        open={open}
        onClose={() => {
          setOpen(false);
          setCopied(false);
        }}
        link={link}
        copied={copied}
        onCopy={copyLink}
      />
    </>
  );
}

type Status = "loading" | "ready" | "error";

function StoryShareSheet({
  slug,
  timezone,
  open,
  onClose,
  link,
  copied,
  onCopy,
}: {
  slug: string;
  timezone: string;
  open: boolean;
  onClose: () => void;
  link: string;
  copied: boolean;
  onCopy: () => Promise<void>;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [freeCount, setFreeCount] = useState<number | null>(null);
  // El File va en estado, no en un ref: `canShareFiles` se calcula en el render
  // y un ref no lo dispararía, así que el botón podría quedar mostrando
  // "Descargar" en un teléfono que sí sabe compartir.
  const [file, setFile] = useState<File | null>(null);
  // El objectURL se revoca al cambiar de día o cerrar; en un ref para no
  // depender del estado dentro del cleanup.
  const urlRef = useRef<string | null>(null);

  const today = todayInTimezone(timezone);
  const [date, setDate] = useState(today);
  const dates = Array.from({ length: DAY_OPTIONS }, (_, i) => addDays(today, i));

  const revoke = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  const load = useCallback(async (target: string) => {
    setStatus("loading");
    setNote(null);
    try {
      // cache-bust: la disponibilidad cambia con cada reserva y no queremos
      // que el browser sirva la grilla de hace una hora.
      const res = await fetch(`/${slug}/story?date=${target}&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const free = res.headers.get(FREE_HEADER);
      setFreeCount(free === null ? null : Number(free));

      const blob = await res.blob();
      setFile(new File([blob], `turnos-${slug}-${target}.png`, { type: "image/png" }));

      revoke();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setPreviewUrl(url);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [slug]);

  // Se recarga al abrir y en cada cambio de día.
  useEffect(() => {
    if (!open) return;
    void load(date);
  }, [open, date, load]);

  useEffect(() => {
    if (open) return;
    // Al cerrar: soltar el blob y volver a hoy para la próxima apertura.
    revoke();
    setPreviewUrl(null);
    setFile(null);
    setDate(today);
  }, [open, today]);

  const download = () => {
    if (!urlRef.current) return;
    const a = document.createElement("a");
    a.href = urlRef.current;
    a.download = `turnos-${slug}-${date}.png`;
    a.click();
    setNote("Imagen descargada. Subila como historia desde Instagram.");
  };

  const share = async () => {
    if (!file) return;

    // canShare({files}) es la única forma fiable de saber si la plataforma
    // acepta compartir archivos. En desktop suele dar false → descarga.
    if (!navigator.canShare?.({ files: [file] })) {
      download();
      return;
    }

    try {
      // Solo `files`: si se manda también `text`/`url`, varias apps (Instagram
      // entre ellas) toman el texto y descartan la imagen.
      await navigator.share({ files: [file] });
    } catch (err) {
      // El usuario canceló el diálogo: no es un error que valga reportar.
      if (err instanceof Error && err.name === "AbortError") return;
      setNote("No se pudo abrir el menú de compartir. Probá descargando la imagen.");
    }
  };

  const canShareFiles =
    typeof navigator !== "undefined" &&
    !!file &&
    !!navigator.canShare?.({ files: [file] });

  return (
    <BottomSheet open={open} onClose={onClose} title="Compartir turnos">
      <div className="px-[24px] pb-[24px] pt-[4px] overflow-y-auto">
        {/* ── Selector de día ── */}
        <div className="flex gap-[8px] overflow-x-auto pb-[14px] -mx-[24px] px-[24px]">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setDate(d)}
              className={`press-fx flex-shrink-0 h-[36px] px-[14px] rounded-full border text-[13px] ${
                d === date
                  ? "bg-ink-1 text-bg border-transparent"
                  : "bg-surface text-ink-2 border-line"
              }`}
              aria-pressed={d === date}
            >
              {chipLabel(d, today)}
            </button>
          ))}
        </div>

        {/* ── Link para el sticker ── */}
        <button
          onClick={() => void onCopy()}
          className="press-fx w-full flex items-center gap-[10px] rounded-[12px] border border-line bg-surface px-[14px] py-[11px] mb-[14px] text-left"
        >
          <Icon
            name={copied ? "check" : "copy"}
            size={15}
            color={copied ? "var(--accent)" : "var(--ink-3)"}
          />
          <span className="font-mono text-[12px] text-ink-1 flex-1 truncate">
            {getFrontendDomain()}/{slug}
          </span>
          <span className="text-[11px] text-ink-3 flex-shrink-0">
            {copied ? "Copiado ✓" : "Copiar"}
          </span>
        </button>

        <p className="text-[12px] text-ink-2 mb-[16px]">
          {copied
            ? "Link copiado. Al subir la historia, pegalo en el sticker de link de Instagram sobre el recuadro punteado."
            : "Copiá el link y pegalo en el sticker de link de Instagram, sobre el recuadro punteado."}
        </p>

        {/* Publicar un día sin turnos reservables es peor que no publicar:
            avisamos antes, pero sin bloquear (quizás lo quiere igual). */}
        {status === "ready" && freeCount === 0 && (
          <div className="flex items-start gap-[10px] rounded-[12px] border border-line bg-status-pending-bg px-[14px] py-[12px] mb-[16px]">
            <Icon name="alert" size={15} color="var(--status-pending)" />
            <span className="text-[12px] text-ink-2">
              Este día no te queda ningún turno libre: la historia saldría sin nada
              para reservar. Probá con otro día.
            </span>
          </div>
        )}

        <div className="rounded-[14px] border border-line bg-surface overflow-hidden mb-[16px] flex items-center justify-center min-h-[220px]">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-[10px] py-[40px]">
              <div className="w-[22px] h-[22px] rounded-full border-2 border-line border-t-accent animate-spin" />
              <span className="text-[12px] text-ink-3">Generando historia…</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-[12px] py-[40px] px-[20px] text-center">
              <Icon name="alert" size={20} color="var(--danger)" />
              <span className="text-[13px] text-ink-2">
                No se pudo generar la historia.
              </span>
              <Btn variant="secondary" size="sm" full={false} onClick={() => void load(date)}>
                Reintentar
              </Btn>
            </div>
          )}

          {status === "ready" && previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- objectURL de un blob local, next/image no aplica
            <img
              src={previewUrl}
              alt="Vista previa de la historia con tus turnos"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          )}
        </div>

        {note && <p className="text-[12px] text-ink-2 mb-[12px]">{note}</p>}

        <div className="flex flex-col gap-[10px]">
          <Btn onClick={() => void share()} disabled={status !== "ready"}>
            {canShareFiles ? "Compartir historia" : "Descargar imagen"}
          </Btn>
          {canShareFiles && (
            <Btn variant="secondary" onClick={download} disabled={status !== "ready"}>
              Descargar imagen
            </Btn>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

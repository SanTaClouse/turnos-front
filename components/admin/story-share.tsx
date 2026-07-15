"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

/**
 * Compartir la disponibilidad como historia de Instagram.
 *
 * Por qué hay un preview y no un botón directo a `navigator.share`:
 *
 * 1. iOS/Safari exige que `share()` se llame dentro del gesto del usuario. Un
 *    `await fetch()` de la imagen en el medio rompe el gesto y tira
 *    NotAllowedError. Con el preview, la imagen ya está en memoria cuando el
 *    dueño toca "Compartir" — el gesto llega intacto.
 * 2. El dueño ve exactamente qué va a publicar antes de publicarlo.
 */
export function StoryShareButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press-fx w-[40px] h-[40px] rounded-full bg-surface border border-line flex items-center justify-center"
        aria-label="Compartir turnos libres en una historia"
        title="Compartir turnos libres"
      >
        <Icon name="image" size={18} color="var(--ink-1)" />
      </button>

      <StoryShareSheet slug={slug} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type Status = "loading" | "ready" | "error";

/** Cabecera que manda la ruta de la historia con los huecos totales. */
const SLOTS_HEADER = "x-slots-total";

function StoryShareSheet({
  slug,
  open,
  onClose,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  // El File va en estado, no en un ref: `canShareFiles` se calcula en el render
  // y un ref no lo dispararía, así que el botón podría quedar mostrando
  // "Descargar" en un teléfono que sí sabe compartir.
  const [file, setFile] = useState<File | null>(null);
  // El objectURL se revoca al cerrar; guardarlo en un ref evita depender del
  // estado dentro del cleanup.
  const urlRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setNote(null);
    try {
      // cache-bust: la disponibilidad cambia con cada reserva y no queremos
      // que el browser sirva la grilla de hace una hora.
      const res = await fetch(`/${slug}/story?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIsEmpty(res.headers.get(SLOTS_HEADER) === "0");
      const blob = await res.blob();

      setFile(new File([blob], `turnos-${slug}.png`, { type: "image/png" }));
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setPreviewUrl(url);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [slug]);

  useEffect(() => {
    if (!open) return;
    void load();

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setPreviewUrl(null);
      setFile(null);
    };
  }, [open, load]);

  const download = () => {
    if (!urlRef.current) return;
    const a = document.createElement("a");
    a.href = urlRef.current;
    a.download = `turnos-${slug}.png`;
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
    <BottomSheet open={open} onClose={onClose} title="Compartir turnos libres">
      <div className="px-[24px] pb-[24px] pt-[4px] overflow-y-auto">
        <p className="text-[13px] text-ink-2 mb-[16px]">
          Los horarios que tenés libres hoy y mañana. Al subirla, agregá el sticker
          de link de Instagram sobre el recuadro punteado con{" "}
          <span className="font-mono text-ink-1">turno1min.app/{slug}</span>.
        </p>

        {/* Publicar "sin horarios libres" es peor que no publicar: avisamos
            antes de que salga, pero sin bloquear (quizás lo quiere igual). */}
        {status === "ready" && isEmpty && (
          <div className="flex items-start gap-[10px] rounded-[12px] border border-line bg-status-pending-bg px-[14px] py-[12px] mb-[16px]">
            <Icon name="alert" size={15} color="var(--status-pending)" />
            <span className="text-[12px] text-ink-2">
              No te queda ningún horario libre hoy ni mañana: la historia saldría
              vacía. Mejor esperá a tener huecos.
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
              <Btn variant="secondary" size="sm" full={false} onClick={() => void load()}>
                Reintentar
              </Btn>
            </div>
          )}

          {status === "ready" && previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- objectURL de un blob local, next/image no aplica
            <img
              src={previewUrl}
              alt="Vista previa de la historia con tus turnos libres"
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

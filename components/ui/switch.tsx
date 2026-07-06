"use client";

/**
 * Toggle con la estética del proyecto (mismo look que el de Horarios).
 *
 * Reemplaza al Switch de shadcn/base-ui que usaba tokens (`bg-primary`,
 * `bg-input`, `bg-background`) que NO existen en nuestro theme: se veía igual
 * prendido que apagado y la pantalla de Cobros parecía "no responder".
 *
 * Mantiene la API (checked / onCheckedChange) para no tocar a los callers.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="press-fx flex-shrink-0"
      style={{
        width: 40,
        height: 24,
        border: 0,
        padding: 2,
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: checked ? "var(--ink-1)" : "var(--line)",
        transition: "background 0.18s",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
      }}
    >
      <span
        className="block w-[20px] h-[20px] rounded-full bg-white"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
      />
    </button>
  );
}

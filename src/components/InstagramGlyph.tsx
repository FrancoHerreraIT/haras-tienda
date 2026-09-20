/**
 * lucide-react ya no distribuye iconos de marca, asi que dibujamos el glifo
 * de Instagram con el mismo trazo que el resto de los iconos.
 *
 * Sin "use client": es SVG puro, sin estado ni handlers, y asi lo puede
 * renderizar tanto el Footer (cliente) como la pagina de contacto (servidor).
 */
export default function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

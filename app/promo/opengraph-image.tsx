// Reusa el OG hero de la landing principal — mismo design para /promo.
// `runtime` debe declararse directo (string literal) — Next no lo reconoce
// si viene re-exportado. El resto sí se puede reusar.
export const runtime = "edge";
export { default, alt, size, contentType, revalidate } from "../opengraph-image";

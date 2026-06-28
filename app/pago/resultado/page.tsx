import { ResultadoView } from "./resultado-view";

interface Props {
  searchParams: { bp?: string; slug?: string; status?: string };
}

export default function PagoResultadoPage({ searchParams }: Props) {
  return (
    <ResultadoView
      bp={searchParams.bp ?? ""}
      slug={searchParams.slug ?? ""}
    />
  );
}

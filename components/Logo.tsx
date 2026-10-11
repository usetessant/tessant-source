import Link from "@/components/SiteLink";
import TessantSymbol from "./TessantSymbol";

export default function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="Tessant home"><TessantSymbol className="brand-symbol" />{!compact && <span>Tessant</span>}</Link>;
}

import { FileText, User } from "lucide-react";

import { getProjectTypeLabelBySlug } from "../../utils/buildQuoteRequest";
import { formatPriceRange, formatWeeks } from "../../utils/formatQuote";
import { parseQuoteNotes } from "../../utils/parseQuoteNotes";
import CompactSectionCard from "./CompactSectionCard";
import DetailField from "./DetailField";

function splitList(value) {
  if (!value) return [];
  return value.split(/\s*[+,]\s*/).map((item) => item.trim()).filter(Boolean);
}

function formatRange(min, max) {
  const minNumber = Number(min);
  const maxNumber = Number(max);
  if (!Number.isFinite(minNumber) || !Number.isFinite(maxNumber)) return null;
  return formatPriceRange(minNumber, maxNumber);
}

export default function RequestDetailContent({ quote }) {
  const notes = parseQuoteNotes(quote.notes);
  const integrations = splitList(notes.integrations);

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <CompactSectionCard icon={User} title="Información del cliente" className="self-start">
        <DetailField label="Nombre" value={quote.lead_name} />
        <DetailField label="Correo" value={quote.lead_email} />
        <DetailField label="Teléfono" value={quote.lead_phone} />
        <DetailField label="Empresa" value={quote.lead_company} />
        <DetailField label="Mensaje" value={quote.lead_message} clamp />
      </CompactSectionCard>

      <CompactSectionCard
        icon={FileText}
        title="Resumen de la cotización"
        className="self-start"
        contentClassName="space-y-2 sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-2 sm:space-y-0"
      >
        <DetailField label="Proyecto" value={getProjectTypeLabelBySlug(quote.project_type)} />
        <DetailField label="Secciones" value={notes.sections} />
        <DetailField label="Integraciones" value={integrations.length > 0 ? integrations.join(", ") : null} clamp />
        <DetailField label="Diseño" value={notes.design} />
        <DetailField label="Plazo deseado" value={notes.deadline} />
        <DetailField label="Detalle adicional" value={notes.additionalDetails} clamp />
        <DetailField label="Inversión referencial" value={formatRange(quote.estimated_min, quote.estimated_max)} highlight />
        <DetailField label="Tiempo estimado" value={formatWeeks(quote.estimated_weeks_min, quote.estimated_weeks_max)} />
      </CompactSectionCard>
    </div>
  );
}

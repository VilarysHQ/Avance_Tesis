import {
  Monitor,
  PanelsTopLeft,
  Puzzle,
  Clock3,
  CalendarDays,
  Coins,
  ArrowRight,
  Lightbulb,
  ClipboardList,
  RotateCcw,
} from "lucide-react";

import { getStepById, getSummaryLabel } from "../../data/quoteQuestions";
import { formatPriceRange, formatWeeks } from "../../utils/formatQuote";

const PENDING = "Pendiente";

export default function QuoteSummary({ flow, onRequest }) {
  const { answers, quote, isComplete, reset } = flow;
  const requirements = flow.context?.requirements ?? null;

  const projectTypeStep = getStepById("projectType");

  const handleRequest = () => {
    if (!isComplete) return;
    onRequest?.();
  };

  return (
    <aside
      className="
        self-start
        overflow-hidden
        rounded-[22px]
        border
        border-white/80
        bg-white/95
        shadow-[0_20px_60px_rgba(30,64,175,0.08)]
        backdrop-blur-sm
      "
    >
      {/* HEADER */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-[#eef4ff]
              text-[#173cff]
            "
          >
            <ClipboardList size={19} />
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-[#07112d]">
              Resumen preliminar
            </h3>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Estimación basada en tus respuestas
            </p>
          </div>
        </div>

        {requirements && <RequirementsDetails requirements={requirements} />}
      </div>

      <div className="p-5">
        <div className="divide-y divide-slate-100">
          <SummaryRow
            icon={Monitor}
            label="Tipo de web"
            value={getSummaryLabel(projectTypeStep, answers.projectType)}
          />

          <SummaryRow
            icon={PanelsTopLeft}
            label="Secciones"
            value={getSummaryLabel(getStepById("sections"), answers.sections)}
          />

          <SummaryRow
            icon={Puzzle}
            label="Integraciones"
            value={getSummaryLabel(
              getStepById("integrations"),
              answers.integrations
            )}
          />

          <SummaryRow
            icon={CalendarDays}
            label="Plazo deseado por el cliente"
            value={getSummaryLabel(getStepById("deadline"), answers.deadline)}
          />

          <SummaryRow
            icon={Clock3}
            label="Tiempo estimado de desarrollo"
            value={formatWeeks(quote.weeksMin, quote.weeksMax)}
          />

          <SummaryRow
            icon={Coins}
            label="Inversión referencial"
            value={formatPriceRange(quote.estimatedMin, quote.estimatedMax)}
            highlight
          />
        </div>

        {/* NOTE */}
        <div
          className="
            mt-4
            flex
            items-start
            gap-3
            rounded-xl
            bg-[#fff8e6]
            px-4
            py-3
          "
        >
          <Lightbulb
            size={17}
            className="mt-0.5 shrink-0 text-amber-500"
          />

          <p className="text-[11px] leading-[18px] text-slate-600">
            Este es un estimado referencial. El valor final puede variar
            según los requerimientos específicos del proyecto.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleRequest}
          disabled={!isComplete}
          className="
            mt-4
            flex
            h-[50px]
            w-full
            items-center
            justify-center
            gap-3
            rounded-xl
            bg-[#173cff]
            px-4
            text-[13px]
            font-semibold
            text-white
            shadow-[0_10px_25px_rgba(23,60,255,0.18)]
            transition
            hover:-translate-y-0.5
            hover:bg-[#0f31e6]
            disabled:cursor-not-allowed
            disabled:opacity-50
            disabled:hover:translate-y-0
            disabled:hover:bg-[#173cff]
          "
        >
          Solicitar propuesta completa

          <ArrowRight size={17} />
        </button>

        {isComplete && (
          <button
            type="button"
            onClick={reset}
            className="
              mt-3
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              px-4
              py-2.5
              text-[12px]
              font-semibold
              text-slate-500
              transition
              hover:border-blue-300
              hover:text-[#173cff]
            "
          >
            <RotateCcw size={14} />
            Reiniciar cotización
          </button>
        )}
      </div>
    </aside>
  );
}

function RequirementsDetails({ requirements }) {
  const features = requirements.requestedFeatures ?? [];
  const integrations = requirements.integrationDetails ?? [];
  const hasDetails = Boolean(
    requirements.businessDescription ||
      features.length > 0 ||
      integrations.length > 0 ||
      requirements.designNotes ||
      requirements.deadlineDetails
  );

  if (!hasDetails) return null;

  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#173cff]">
        Detalles para revisión
      </p>
      {requirements.businessDescription && (
        <p className="mt-2 text-[11px] leading-[18px] text-slate-600">
          {requirements.businessDescription}
        </p>
      )}
      {features.length > 0 && (
        <DetailLine label="Funcionalidades" value={features.join(", ")} />
      )}
      {integrations.length > 0 && (
        <DetailLine label="Integraciones mencionadas" value={integrations.join(", ")} />
      )}
      {requirements.designNotes && (
        <DetailLine label="Diseño" value={requirements.designNotes} />
      )}
      {requirements.deadlineDetails && (
        <DetailLine label="Detalle del plazo solicitado" value={requirements.deadlineDetails} />
      )}
      <p className="mt-2 text-[10px] leading-4 text-slate-400">
        Estos detalles se conservan para revisión comercial. Solo las opciones del cotizador
        intervienen en la estimación mostrada.
      </p>
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <p className="mt-1.5 text-[11px] leading-[18px] text-slate-600">
      <span className="font-semibold text-slate-700">{label}:</span> {value}
    </p>
  );
}

function SummaryRow({ icon: Icon, label, value, highlight = false }) {
  const isEmpty = value == null || value === "";

  return (
    <div className="flex gap-4 py-3.5 first:pt-1">
      <div
        className="
          mt-0.5
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-blue-50
          text-[#173cff]
        "
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400">
          {label}
        </p>

        <p
          className={`
            mt-1
            text-[13px]
            font-semibold
            leading-5
            ${
              isEmpty
                ? "text-slate-400"
                : highlight
                  ? "text-[#173cff]"
                  : "text-[#07112d]"
            }
          `}
        >
          {isEmpty ? PENDING : value}
        </p>
      </div>
    </div>
  );
}

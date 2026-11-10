import { useCallback, useState } from "react";

import useQuoteFlow from "../../hooks/useQuoteFlow";
import useSmartQuoteFlow from "../../hooks/useSmartQuoteFlow";
import ChatPanel from "./ChatPanel";
import QuoteRequestForm from "./QuoteRequestForm";
import QuoteSummary from "./QuoteSummary";
import SmartChatPanel from "./SmartChatPanel";

export default function QuoteAssistant() {
    const classicFlow = useQuoteFlow();
    const smartFlow = useSmartQuoteFlow();
    const [mode, setMode] = useState("smart");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const flow = mode === "smart" ? smartFlow : classicFlow;

    const { isComplete, answers, quote, reset } = flow;
    const requirements = flow.context?.requirements ?? null;

    const handleOpenForm = useCallback(() => {
        if (isComplete) setIsFormOpen(true);
    }, [isComplete]);

    const handleCloseForm = useCallback(() => {
        setIsFormOpen(false);
    }, []);

    const handleModeChange = useCallback((nextMode) => {
        setIsFormOpen(false);
        setMode(nextMode);
    }, []);

    const handleStartOver = useCallback(() => {
        setIsFormOpen(false);
        reset();
        document
            .getElementById("cotizador")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [reset]);

    return (
        <section
            id="cotizador"
            className="
        relative
        w-full
        overflow-hidden
        bg-[linear-gradient(180deg,#f9fbff_0%,#f5f9ff_45%,#f8fbff_100%)]
        py-10
        lg:py-6
      "
        >
            {/* decoraciones suaves */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-[-120px] top-[80px] h-[260px] w-[260px] rounded-full bg-blue-100/30 blur-3xl" />
                <div className="absolute right-[-80px] top-[120px] h-[300px] w-[300px] rounded-full bg-blue-100/25 blur-3xl" />
                <div className="absolute bottom-[-120px] left-[20%] h-[240px] w-[240px] rounded-full bg-sky-100/20 blur-3xl" />
            </div>

            <div className="relative mx-auto w-full max-w-[1280px] px-6">
                {/* HEADER */}
                <div className="mx-auto max-w-[760px] text-center">
                    <span
                        className="
              inline-flex
              items-center
              rounded-full
              border
              border-blue-100
              bg-white
              px-4
              py-2
              text-[11px]
              font-bold
              uppercase
              tracking-[0.18em]
              text-[#173cff]
              shadow-sm
            "
                    >
                        ✦ Cotizador inteligente
                    </span>

                    <h2
                        className="
              mt-4
              text-[36px]
              font-extrabold
              leading-tight
              tracking-[-0.035em]
              text-[#07112d]
              md:text-[44px]
            "
                    >
                        Tu cotización empieza{" "}
                        <span className="text-[#173cff]">aquí</span>
                    </h2>

                    <p className="mx-auto mt-3 max-w-[700px] text-[15px] leading-6 text-slate-600">
                        Describe tu idea libremente o utiliza el cuestionario clásico para
                        obtener una estimación preliminar.
                    </p>
                </div>

                <div className="mx-auto mt-6 flex w-fit rounded-xl border border-blue-100 bg-white p-1 shadow-sm" role="group" aria-label="Modo del cotizador">
                    <ModeButton active={mode === "smart"} onClick={() => handleModeChange("smart")}>
                        Conversar con IA
                    </ModeButton>
                    <ModeButton active={mode === "classic"} onClick={() => handleModeChange("classic")}>
                        Cuestionario clásico
                    </ModeButton>
                </div>

                {/* MAIN */}
                <div
                    className="
            mt-8
            grid
            items-start
            gap-5
            lg:grid-cols-[1.75fr_0.85fr]
          "
                >
                    {mode === "smart" ? (
                        <SmartChatPanel
                            flow={smartFlow}
                            onUseClassic={() => handleModeChange("classic")}
                        />
                    ) : (
                        <ChatPanel flow={classicFlow} />
                    )}
                    <QuoteSummary flow={flow} onRequest={handleOpenForm} />
                </div>
            </div>

            {isFormOpen && (
                <QuoteRequestForm
                    answers={answers}
                    quote={quote}
                    requirements={requirements}
                    onClose={handleCloseForm}
                    onStartOver={handleStartOver}
                />
            )}
        </section>
    );
}

function ModeButton({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`rounded-lg px-4 py-2 text-[12px] font-semibold transition ${
                active
                    ? "bg-[#173cff] text-white shadow-[0_6px_16px_rgba(23,60,255,0.18)]"
                    : "text-slate-500 hover:bg-blue-50 hover:text-[#173cff]"
            }`}
        >
            {children}
        </button>
    );
}

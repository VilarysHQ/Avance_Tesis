import { useEffect, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
} from "lucide-react";

import ChatMessage from "./ChatMessage";
import { Progress, UserMessage } from "./ChatPanel";

export default function SmartChatPanel({ flow, onUseClassic }) {
  const {
    messages,
    progress,
    status,
    input,
    error,
    isLoading,
    isComplete,
    setInput,
    sendMessage,
    reset,
  } = flow;
  const scrollRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, isLoading, error]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isLoading && input.trim()) sendMessage();
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(30,64,175,0.08)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#173cff] text-white shadow-[0_8px_20px_rgba(23,60,255,0.22)]">
            <MessageSquareText size={19} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[16px] font-bold text-[#07112d]">
                Asistente inteligente
              </h3>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#173cff]">
                Gemini
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Describe tu proyecto y completa los requisitos conversando
            </p>
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          <p className="mb-2 text-right text-[11px] font-semibold text-slate-500">
            {isComplete ? "Requisitos completos" : `${progress.current} de ${progress.total} confirmados`}
          </p>
          <div className="flex gap-1.5" aria-label={`${progress.current} de ${progress.total} requisitos confirmados`}>
            {Array.from({ length: progress.total }).map((_, index) => (
              <Progress key={index} active={index < progress.current} />
            ))}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="h-[370px] overflow-y-auto scroll-smooth px-5 py-5 xl:h-[390px]"
        aria-live="polite"
      >
        {messages.map((message) =>
          message.role === "user" ? (
            <UserMessage key={message.id} time={message.time}>
              {message.text}
            </UserMessage>
          ) : (
            <ChatMessage key={message.id} time={message.time}>
              {message.text}
            </ChatMessage>
          )
        )}

        {isLoading && (
          <div className="mb-4 flex items-center gap-3 pl-12 text-[12px] text-slate-500" role="status">
            <Loader2 size={16} className="animate-spin text-[#173cff]" />
            Interpretando tus requerimientos…
          </div>
        )}

        {status === "error" && error && (
          <div className="mb-4 ml-12 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-2 text-[12px] leading-5 text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={onUseClassic}
              className="mt-2 text-[11px] font-semibold text-[#173cff] underline-offset-2 hover:underline"
            >
              Continuar con el cuestionario clásico
            </button>
          </div>
        )}

        {isComplete && (
          <div className="ml-12 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[11px] leading-5 text-emerald-700">
            <CheckCircle2 size={16} className="shrink-0" />
            Puedes seguir escribiendo si deseas corregir algún requisito.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-white px-4 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-[#f8faff] px-3 py-2 transition focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(23,60,255,0.05)]">
          <textarea
            rows={1}
            maxLength={2000}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
            disabled={isLoading}
            aria-label="Describe tu proyecto"
            placeholder={isComplete ? "Escribe una corrección…" : "Describe el proyecto que necesitas…"}
            className="max-h-24 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-2 text-[13px] leading-5 text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-wait"
          />

          <button
            type="submit"
            disabled={isLoading || input.trim().length === 0}
            aria-label="Enviar mensaje"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#173cff] text-white shadow-[0_8px_20px_rgba(23,60,255,0.20)] transition hover:bg-[#0f31e6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <p className="text-[10px] text-slate-400">
            Enter para enviar · Shift + Enter para otra línea
          </p>
          <button
            type="button"
            onClick={reset}
            className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-400 transition hover:text-[#173cff]"
          >
            <RotateCcw size={11} />
            Reiniciar
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useRef } from "react";
import {
  MessageSquareText,
  Send,
  Paperclip,
  CheckCheck,
  ArrowRight,
} from "lucide-react";

import ChatMessage from "./ChatMessage";
import QuickOptions from "./QuickOptions";

export default function ChatPanel({ flow }) {
  const {
    messages,
    activeStep,
    selectedValues,
    progress,
    isIdle,
    isComplete,
    detailDraft,
    selectOption,
    toggleIntegration,
    continueMulti,
    setDetail,
    submitDetail,
    skipDetail,
  } = flow;

  const scrollRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, activeStep]);

  const showOptions = Boolean(
    isIdle && activeStep && activeStep.options.length > 0
  );
  const isMultiple = activeStep?.type === "multiple";
  const isTextStep = isIdle && activeStep?.type === "text";

  const handleSelect = (value) => {
    if (isMultiple) {
      toggleIntegration(value);
    } else {
      selectOption(value);
    }
  };

  const handleSubmit = () => {
    if (!isTextStep || detailDraft.trim().length === 0) return;
    submitDetail();
  };

  return (
    <div
      className="
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
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-[#173cff]
              text-white
              shadow-[0_8px_20px_rgba(23,60,255,0.22)]
            "
          >
            <MessageSquareText size={19} />
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-[#07112d]">
              Asistente de cotización
            </h3>

            <p className="mt-0.5 text-[12px] text-slate-500">
              Te guiamos paso a paso para conocer tu proyecto
            </p>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="hidden sm:block">
          <p className="mb-2 text-right text-[11px] font-semibold text-slate-500">
            {isComplete
              ? "Cotización completa"
              : `Paso ${progress.current} de ${progress.total}`}
          </p>

          <div className="flex gap-1.5">
            {Array.from({ length: progress.total }).map((_, index) => (
              <Progress key={index} active={index < progress.current} />
            ))}
          </div>
        </div>
      </div>

      {/* CHAT */}
      <div
        ref={scrollRef}
        className="
          h-[370px]
          overflow-y-auto
          scroll-smooth
          px-5
          py-5
          xl:h-[390px]
        "
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

        {showOptions && (
          <>
            <QuickOptions
              options={activeStep.options}
              selected={selectedValues}
              onSelect={handleSelect}
            />

            {isMultiple && (
              <div className="mb-4 flex justify-end pl-12">
                <button
                  type="button"
                  onClick={continueMulti}
                  disabled={selectedValues.length === 0}
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-full
                    bg-[#173cff]
                    px-4
                    py-2
                    text-[12px]
                    font-semibold
                    text-white
                    shadow-[0_6px_15px_rgba(23,60,255,0.15)]
                    transition
                    hover:bg-[#0f31e6]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Continuar
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </>
        )}

        {isTextStep && (
          <div className="mb-4 flex justify-end pl-12">
            <button
              type="button"
              onClick={skipDetail}
              className="
                text-[11px]
                font-semibold
                text-slate-400
                underline-offset-2
                transition
                hover:text-[#173cff]
                hover:underline
              "
            >
              Omitir este paso
            </button>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="border-t border-slate-100 bg-white px-4 py-3">
        <div
          className={`
            flex
            items-center
            gap-2
            rounded-2xl
            border
            border-slate-200
            bg-[#f8faff]
            px-3
            py-2
            transition
            focus-within:border-blue-300
            focus-within:bg-white
            focus-within:shadow-[0_0_0_4px_rgba(23,60,255,0.05)]

            ${!isTextStep ? "opacity-60" : ""}
          `}
        >
          <button
            type="button"
            disabled
            aria-hidden="true"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
            "
          >
            <Paperclip size={17} />
          </button>

          <input
            type="text"
            maxLength={500}
            value={isTextStep ? detailDraft : ""}
            onChange={(event) => setDetail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
              }
            }}
            disabled={!isTextStep}
            placeholder={
              isTextStep
                ? "Escribe tu respuesta aquí..."
                : "Completa los pasos anteriores..."
            }
            className="
              h-9
              min-w-0
              flex-1
              bg-transparent
              text-[13px]
              text-slate-700
              outline-none
              disabled:cursor-not-allowed
              placeholder:text-slate-400
            "
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isTextStep || detailDraft.trim().length === 0}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[#173cff]
              text-white
              shadow-[0_8px_20px_rgba(23,60,255,0.20)]
              transition
              hover:bg-[#0f31e6]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Progress({ active = false }) {
  return (
    <div
      className={`
        h-1.5
        w-7
        rounded-full
        ${active ? "bg-[#173cff]" : "bg-slate-200"}
      `}
    />
  );
}

export function UserMessage({ children, time }) {
  return (
    <div className="mb-4 flex justify-end">
      <div className="max-w-[72%]">
        <div
          className="
            rounded-2xl
            rounded-tr-md
            bg-[#173cff]
            px-4
            py-2.5
            text-[13px]
            leading-5
            text-white
            shadow-[0_8px_20px_rgba(23,60,255,0.12)]
          "
        >
          {children}
        </div>

        <div className="mt-1 flex items-center justify-end gap-1 pr-1">
          <span className="text-[10px] text-slate-400">
            {time ?? ""}
          </span>

          <CheckCheck size={13} className="text-[#173cff]" />
        </div>
      </div>
    </div>
  );
}

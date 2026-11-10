import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
  User,
  Building2,
  Mail,
  Phone,
  MessageSquare,
} from "lucide-react";

import { createQuoteRequest } from "../../services/api";
import {
  buildQuoteRequestPayload,
  getProjectTypeLabel,
} from "../../utils/buildQuoteRequest";
import { formatPriceRange, formatWeeks } from "../../utils/formatQuote";
import {
  createRequestId,
  createSubmissionGuard,
} from "../../utils/submissionGuard";

const EMPTY_FIELDS = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  message: "",
};

function validate(fields) {
  const errors = {};

  if (!fields.fullName.trim()) {
    errors.fullName = "Ingresa tu nombre completo.";
  }

  if (!fields.email.trim()) {
    errors.email = "Ingresa tu correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (fields.phone.trim().length > 40) {
    errors.phone = "El teléfono es demasiado largo.";
  }

  if (fields.message.length > 1000) {
    errors.message = "El comentario no puede superar los 1000 caracteres.";
  }

  return errors;
}

function getFriendlyError(error) {
  if (error?.isNetworkError) {
    return "No pudimos conectar con el servidor. Revisa tu conexión e intenta nuevamente.";
  }

  if (error?.status === 400) {
    return error?.details?.[0] ?? "Algunos datos no son válidos. Revísalos e intenta nuevamente.";
  }

  if (error?.status === 409) {
    return "La solicitud cambió después de iniciarse. Revísala e intenta enviarla nuevamente.";
  }

  if (error?.status >= 500) {
    return "Ocurrió un problema en el servidor. Intenta nuevamente en unos momentos.";
  }

  return "No pudimos registrar tu solicitud. Intenta nuevamente.";
}

export default function QuoteRequestForm({
  answers,
  quote,
  requirements,
  onClose,
  onStartOver,
}) {
  const [fields, setFields] = useState({ ...EMPTY_FIELDS });
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState(null);
  const [submissionGuard] = useState(createSubmissionGuard);
  const requestIdRef = useRef(null);

  const isLoading = status === "loading";

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape" && !isLoading) onClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isLoading, onClose]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFields((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    requestIdRef.current = null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    const errors = validate(fields);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!submissionGuard.tryStart()) return;
    requestIdRef.current ??= createRequestId();

    setStatus("loading");
    setServerError("");

    try {
      const payload = buildQuoteRequestPayload({
        answers,
        contact: fields,
        requestId: requestIdRef.current,
        requirements,
      });
      const response = await createQuoteRequest(payload);
      setResult(response.data);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setServerError(getFriendlyError(error));
    } finally {
      submissionGuard.finish();
    }
  };

  const handleOverlayClick = () => {
    if (!isLoading) onClose();
  };

  const handleGoHome = () => {
    onClose();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        className="
          my-auto
          w-full
          max-w-lg
          overflow-hidden
          rounded-[22px]
          border
          border-white/80
          bg-white
          shadow-[0_30px_80px_rgba(15,23,42,0.25)]
        "
      >
        {status === "success" && result ? (
          <SuccessView
            result={result}
            answers={answers}
            quote={quote}
            onGoHome={handleGoHome}
            onStartOver={onStartOver}
          />
        ) : (
          <>
            {/* HEADER */}
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
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
                  <Send size={18} />
                </div>

                <div>
                  <h3 className="text-[16px] font-bold text-[#07112d]">
                    Solicitar propuesta completa
                  </h3>

                  <p className="mt-0.5 text-[12px] text-slate-500">
                    Déjanos tus datos y te contactaremos
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                aria-label="Cerrar"
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-600
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <X size={18} />
              </button>
            </div>

            {/* BODY */}
            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre completo"
                  required
                  icon={User}
                  error={fieldErrors.fullName}
                  className="sm:col-span-1"
                >
                  <input
                    type="text"
                    value={fields.fullName}
                    onChange={handleChange("fullName")}
                    placeholder="Ej. Juan Pérez"
                    disabled={isLoading}
                    className={inputClass(fieldErrors.fullName)}
                  />
                </Field>

                <Field
                  label="Empresa"
                  icon={Building2}
                  error={fieldErrors.companyName}
                  className="sm:col-span-1"
                >
                  <input
                    type="text"
                    value={fields.companyName}
                    onChange={handleChange("companyName")}
                    placeholder="Opcional"
                    disabled={isLoading}
                    className={inputClass(fieldErrors.companyName)}
                  />
                </Field>

                <Field
                  label="Correo"
                  required
                  icon={Mail}
                  error={fieldErrors.email}
                  className="sm:col-span-2"
                >
                  <input
                    type="email"
                    value={fields.email}
                    onChange={handleChange("email")}
                    placeholder="tucorreo@ejemplo.com"
                    disabled={isLoading}
                    className={inputClass(fieldErrors.email)}
                  />
                </Field>

                <Field
                  label="Teléfono"
                  icon={Phone}
                  error={fieldErrors.phone}
                  className="sm:col-span-2"
                >
                  <input
                    type="tel"
                    value={fields.phone}
                    onChange={handleChange("phone")}
                    placeholder="Opcional"
                    disabled={isLoading}
                    className={inputClass(fieldErrors.phone)}
                  />
                </Field>

                <Field
                  label="Comentario adicional"
                  icon={MessageSquare}
                  error={fieldErrors.message}
                  className="sm:col-span-2"
                >
                  <textarea
                    rows={3}
                    value={fields.message}
                    onChange={handleChange("message")}
                    placeholder="Opcional"
                    maxLength={1000}
                    disabled={isLoading}
                    className="
                      w-full
                      resize-none
                      rounded-xl
                      border
                      border-slate-200
                      bg-[#f8faff]
                      px-3
                      py-2.5
                      text-[13px]
                      leading-5
                      text-slate-700
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-blue-300
                      focus:bg-white
                      focus:shadow-[0_0_0_4px_rgba(23,60,255,0.05)]
                    "
                  />
                </Field>
              </div>

              {status === "error" && serverError && (
                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-red-100
                    bg-red-50
                    px-4
                    py-3
                    text-[12px]
                    leading-5
                    text-red-600
                  "
                >
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="
                  mt-5
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
                  disabled:opacity-60
                  disabled:hover:translate-y-0
                "
              >
                {isLoading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar solicitud
                    <Send size={16} />
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                Al enviar aceptas que te contactemos para coordinar tu propuesta.
              </p>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function inputClass(error) {
  return error
    ? "h-9 min-w-0 flex-1 rounded-xl border border-red-300 bg-red-50/40 px-3 text-[13px] text-slate-700 outline-none transition focus:border-red-400"
    : "h-11 w-full rounded-xl border border-slate-200 bg-[#f8faff] px-3 text-[13px] text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(23,60,255,0.05)]";
}

function Field({ label, required = false, icon: Icon, error, className = "", children }) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
        {required && <span className="text-[#173cff]">*</span>}
      </label>

      {children}

      {error && (
        <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}

function SuccessView({ result, answers, quote, onGoHome, onStartOver }) {
  return (
    <div className="p-6 text-center">
      <div
        className="
          mx-auto
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-full
          bg-emerald-50
          text-emerald-500
        "
      >
        <CheckCircle2 size={28} />
      </div>

      <h3 className="mt-4 text-[18px] font-bold text-[#07112d]">
        Solicitud registrada correctamente
      </h3>

      <p className="mt-1 text-[12px] text-slate-500">
        Nos pondremos en contacto contigo.
      </p>

      <div
        className="
          mt-4
          rounded-xl
          border
          border-blue-100
          bg-[#f5f9ff]
          px-4
          py-3
        "
      >
        <p className="text-[11px] font-medium text-slate-400">
          Código de cotización
        </p>
        <p className="mt-1 text-[15px] font-bold tracking-wide text-[#173cff]">
          {result?.quote?.code}
        </p>
      </div>

      <div className="mt-4 divide-y divide-slate-100 text-left">
        <ResultRow
          label="Tipo de proyecto"
          value={getProjectTypeLabel(answers.projectType) ?? "No indicado"}
        />
        <ResultRow
          label="Rango estimado"
          value={formatPriceRange(quote.estimatedMin, quote.estimatedMax) ?? "No disponible"}
        />
        <ResultRow
          label="Tiempo aproximado"
          value={formatWeeks(quote.weeksMin, quote.weeksMax) ?? "No disponible"}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onGoHome}
          className="
            flex
            h-11
            flex-1
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-slate-200
            px-4
            text-[12px]
            font-semibold
            text-slate-600
            transition
            hover:border-blue-300
            hover:text-[#173cff]
          "
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="
            flex
            h-[50px]
            flex-1
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[#173cff]
            px-4
            text-[13px]
            font-semibold
            text-white
            shadow-[0_10px_25px_rgba(23,60,255,0.18)]
            transition
            hover:bg-[#0f31e6]
          "
        >
          <RotateCcw size={15} />
          Realizar otra cotización
        </button>
      </div>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-[#07112d]">
        {value}
      </span>
    </div>
  );
}

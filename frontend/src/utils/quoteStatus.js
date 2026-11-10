export const QUOTE_STATUSES = [
  "draft",
  "submitted",
  "contacted",
  "sent",
  "negotiation",
  "won",
  "lost",
];

export const QUOTE_STATUS_MAP = {
  draft: {
    label: "Borrador",
    classes: "bg-slate-100 text-slate-600 border-slate-200",
  },
  submitted: {
    label: "Nueva",
    classes: "bg-blue-50 text-blue-600 border-blue-100",
  },
  contacted: {
    label: "Contactado",
    classes: "bg-amber-50 text-amber-600 border-amber-100",
  },
  sent: {
    label: "Enviada",
    classes: "bg-violet-50 text-violet-600 border-violet-100",
  },
  negotiation: {
    label: "Negociación",
    classes: "bg-orange-50 text-orange-600 border-orange-100",
  },
  won: {
    label: "Ganada",
    classes: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  lost: {
    label: "Perdida",
    classes: "bg-red-50 text-red-600 border-red-100",
  },
};

const FALLBACK_STATUS = {
  label: "Desconocido",
  classes: "bg-slate-100 text-slate-500 border-slate-200",
};

export const QUOTE_STATUS_OPTIONS = QUOTE_STATUSES.map((value) => ({
  value,
  label: QUOTE_STATUS_MAP[value].label,
}));

export function getStatusMeta(status) {
  return QUOTE_STATUS_MAP[status] ?? FALLBACK_STATUS;
}

export function getStatusLabel(status) {
  return getStatusMeta(status).label;
}

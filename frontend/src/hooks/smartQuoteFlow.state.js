export const REQUIRED_REQUIREMENT_FIELDS = [
  "projectType",
  "sections",
  "integrations",
  "designStatus",
  "deadline",
];

export const EMPTY_SMART_ANSWERS = Object.freeze({
  projectType: null,
  sections: null,
  integrations: [],
  designStatus: null,
  deadline: null,
  additionalDetails: "",
});

export function createSmartInitialState(time = "") {
  return {
    status: "idle",
    input: "",
    messages: [
      {
        id: "smart-assistant-intro",
        role: "assistant",
        text: "Cuéntame con tus propias palabras qué proyecto necesitas. Te haré preguntas breves para completar los requisitos.",
        time,
      },
    ],
    context: null,
    answers: { ...EMPTY_SMART_ANSWERS, integrations: [] },
    missingFields: [...REQUIRED_REQUIREMENT_FIELDS],
    ambiguousFields: [],
    followUpQuestion: null,
    complete: false,
    error: "",
    activeRequestId: null,
  };
}

function answersFromRequirements(requirements) {
  return {
    projectType: requirements.projectType,
    sections: requirements.sections,
    integrations: [...requirements.integrations],
    designStatus: requirements.designStatus,
    deadline: requirements.deadline,
    additionalDetails: requirements.additionalDetails,
  };
}

function assistantText(payload) {
  return payload.assistantReply || payload.followUpQuestion ||
    "Cuéntame un poco más sobre tu proyecto.";
}

export function smartQuoteReducer(state, action) {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: action.value.slice(0, 2000) };

    case "REQUEST_STARTED":
      if (state.status === "loading") return state;
      return {
        ...state,
        status: "loading",
        input: "",
        error: "",
        activeRequestId: action.requestId,
        messages: [
          ...state.messages,
          {
            id: `smart-user-${action.requestId}`,
            role: "user",
            text: action.message,
            time: action.time,
          },
        ],
      };

    case "REQUEST_SUCCEEDED": {
      if (state.activeRequestId !== action.requestId) return state;
      const payload = action.payload;
      return {
        ...state,
        status: payload.complete ? "complete" : "ready",
        context: {
          requirements: payload.requirements,
          fieldStatus: payload.fieldStatus,
          lastQuestion: payload.followUpQuestion,
          lastAssistantReply: payload.assistantReply,
          lastOfferedOptionsField: payload.offeredOptionsField,
          lastOfferedOptions: [...payload.offeredOptions],
        },
        answers: answersFromRequirements(payload.requirements),
        missingFields: [...payload.missingFields],
        ambiguousFields: [...payload.ambiguousFields],
        followUpQuestion: payload.followUpQuestion,
        complete: payload.complete,
        error: "",
        activeRequestId: null,
        messages: [
          ...state.messages,
          {
            id: `smart-assistant-${action.requestId}`,
            role: "assistant",
            text: assistantText(payload),
            time: action.time,
          },
        ],
      };
    }

    case "REQUEST_FAILED":
      if (state.activeRequestId !== action.requestId) return state;
      return {
        ...state,
        status: "error",
        error: action.error,
        activeRequestId: null,
      };

    case "RESET":
      return createSmartInitialState(action.time);

    default:
      return state;
  }
}

export function getConfirmedProgress(context) {
  if (!context?.fieldStatus) return { current: 0, total: REQUIRED_REQUIREMENT_FIELDS.length };
  return {
    current: REQUIRED_REQUIREMENT_FIELDS.filter(
      (field) => context.fieldStatus[field] === "confirmed"
    ).length,
    total: REQUIRED_REQUIREMENT_FIELDS.length,
  };
}

export function getSmartQuoteErrorMessage(error) {
  if (error?.isTimeout || error?.status === 504) {
    return "El asistente tardó demasiado en responder. Tus datos confirmados se conservaron; inténtalo nuevamente.";
  }
  if (error?.isNetworkError) {
    return "No pudimos conectar con el asistente. Tus datos confirmados se conservaron.";
  }
  if (error?.status === 429) {
    return "Se alcanzó el límite temporal de consultas. Espera un momento antes de intentarlo.";
  }
  return "No pudimos interpretar el mensaje. Tus datos confirmados se conservaron; puedes reintentar o usar el cuestionario clásico.";
}

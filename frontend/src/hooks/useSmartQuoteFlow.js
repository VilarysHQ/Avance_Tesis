import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { extractRequirements } from "../services/api.js";
import { calculateQuote } from "../utils/calculateQuote.js";
import { formatTime } from "../utils/formatQuote.js";
import {
  createSmartInitialState,
  getConfirmedProgress,
  getSmartQuoteErrorMessage,
  smartQuoteReducer,
} from "./smartQuoteFlow.state.js";

export default function useSmartQuoteFlow() {
  const [state, dispatch] = useReducer(
    smartQuoteReducer,
    undefined,
    () => createSmartInitialState(formatTime())
  );
  const sequenceRef = useRef(0);
  const pendingRef = useRef(false);
  const controllerRef = useRef(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    []
  );

  const setInput = useCallback((value) => {
    dispatch({ type: "SET_INPUT", value });
  }, []);

  const sendMessage = useCallback(
    async (rawMessage = state.input) => {
      const message = rawMessage.trim();
      if (!message || pendingRef.current) return false;

      pendingRef.current = true;
      const requestId = ++sequenceRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      dispatch({
        type: "REQUEST_STARTED",
        requestId,
        message,
        time: formatTime(),
      });

      try {
        const payload = await extractRequirements(message, state.context, {
          signal: controller.signal,
        });
        dispatch({
          type: "REQUEST_SUCCEEDED",
          requestId,
          payload,
          time: formatTime(),
        });
        return true;
      } catch (error) {
        if (!controller.signal.aborted) {
          dispatch({
            type: "REQUEST_FAILED",
            requestId,
            error: getSmartQuoteErrorMessage(error),
          });
        }
        return false;
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
        pendingRef.current = false;
      }
    },
    [state.context, state.input]
  );

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    pendingRef.current = false;
    sequenceRef.current += 1;
    dispatch({ type: "RESET", time: formatTime() });
  }, []);

  const quote = useMemo(() => calculateQuote(state.answers), [state.answers]);
  const progress = useMemo(() => getConfirmedProgress(state.context), [state.context]);

  return {
    mode: "smart",
    ...state,
    quote,
    progress,
    isComplete: state.complete,
    isLoading: state.status === "loading",
    setInput,
    sendMessage,
    reset,
  };
}

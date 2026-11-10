export function createSubmissionGuard() {
  let pending = false;
  return {
    tryStart() {
      if (pending) return false;
      pending = true;
      return true;
    },
    finish() {
      pending = false;
    },
  };
}

export function createRequestId() {
  return globalThis.crypto.randomUUID();
}

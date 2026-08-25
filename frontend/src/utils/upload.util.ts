import type { AxiosProgressEvent } from "axios";

const UPLOAD_INACTIVITY_TIMEOUT_MS = 60_000;

type UploadRequest<T> = (
  signal: AbortSignal,
  onUploadProgress: (progressEvent: AxiosProgressEvent) => void,
) => Promise<T>;

export const withUploadInactivityTimeout = async <T>(
  request: UploadRequest<T>,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
): Promise<T> => {
  const controller = new AbortController();
  let inactivityTimeout: ReturnType<typeof setTimeout> | undefined;

  const clearInactivityTimeout = () => {
    if (inactivityTimeout === undefined) return;
    clearTimeout(inactivityTimeout);
    inactivityTimeout = undefined;
  };

  const resetInactivityTimeout = () => {
    clearInactivityTimeout();
    inactivityTimeout = setTimeout(
      () => controller.abort(),
      UPLOAD_INACTIVITY_TIMEOUT_MS,
    );
  };

  resetInactivityTimeout();

  try {
    return await request(controller.signal, (progressEvent) => {
      resetInactivityTimeout();
      onUploadProgress?.(progressEvent);
    });
  } finally {
    clearInactivityTimeout();
  }
};

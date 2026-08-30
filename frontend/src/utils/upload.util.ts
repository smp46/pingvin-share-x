import type { AxiosProgressEvent } from "axios";

const UPLOAD_INACTIVITY_TIMEOUT_MS = 60_000;

export type UploadProgressHandler = (progressEvent: AxiosProgressEvent) => void;

type UploadRequest<T> = (
  signal: AbortSignal,
  onUploadProgress: UploadProgressHandler,
) => Promise<T>;

export const withUploadInactivityTimeout = async <T>(
  request: UploadRequest<T>,
  onUploadProgress?: UploadProgressHandler,
): Promise<T> => {
  const controller = new AbortController();
  let inactivityTimeout: ReturnType<typeof setTimeout> | undefined;

  const resetInactivityTimeout = () => {
    clearTimeout(inactivityTimeout);
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
    clearTimeout(inactivityTimeout);
  }
};

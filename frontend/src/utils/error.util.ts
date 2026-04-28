export function getApiErrorMessage(error: any): string | undefined {
  const data = error?.response?.data;

  const message = data?.message;
  if (typeof message === "string" && message.trim().length > 0) return message;
  if (Array.isArray(message)) {
    const joined = message.filter(Boolean).join("\n");
    if (joined.trim().length > 0) return joined;
  }

  const errorField = data?.error;
  if (typeof errorField === "string" && errorField.trim().length > 0)
    return errorField;

  if (typeof error?.message === "string" && error.message.trim().length > 0)
    return error.message;

  try {
    if (data) return JSON.stringify(data, null, 2);
  } catch {
    // ignore
  }
  return undefined;
}

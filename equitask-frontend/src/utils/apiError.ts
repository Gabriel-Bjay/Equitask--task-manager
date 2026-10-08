// DRF replies with {error}, {detail}, {message}, or per-field lists such as
// {"password": ["This password is too common."]}; surface the first readable one.
export const apiErrorMessage = (error: any, fallback: string): string => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return fallback;

  const direct = data.error ?? data.detail ?? data.message;
  if (typeof direct === 'string') return direct;

  for (const [field, value] of Object.entries(data)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first !== 'string') continue;
    if (field === 'non_field_errors') return first;
    const label = field.replace(/_/g, ' ');
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${first}`;
  }
  return fallback;
};

// Per-field messages from a DRF validation error, first message per field,
// e.g. {"email": "user with this email already exists."}.
export const apiFieldErrors = (error: any): Record<string, string> => {
  const data = error?.response?.data;
  const fields: Record<string, string> = {};
  if (!data || typeof data !== 'object') return fields;

  for (const [field, value] of Object.entries(data)) {
    if (['error', 'detail', 'message', 'non_field_errors'].includes(field)) continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') fields[field] = first;
  }
  return fields;
};

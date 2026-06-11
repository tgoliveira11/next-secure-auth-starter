export function readNamedFormField(
  form: HTMLFormElement,
  name: string,
  fallback = ""
): string {
  const fromFormData = new FormData(form).get(name);
  if (typeof fromFormData === "string" && fromFormData.length > 0) {
    return fromFormData;
  }

  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement && field.value.length > 0) {
    return field.value;
  }
  if (field instanceof HTMLTextAreaElement && field.value.length > 0) {
    return field.value;
  }

  return fallback;
}

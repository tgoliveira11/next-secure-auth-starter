export class PreferencesDisabledError extends Error {
  constructor() {
    super("User preferences are disabled");
    this.name = "PreferencesDisabledError";
  }
}

export class PreferenceNamespaceForbiddenError extends Error {
  constructor() {
    super("Namespace is not allowed");
    this.name = "PreferenceNamespaceForbiddenError";
  }
}

export class PreferenceNotFoundError extends Error {
  constructor() {
    super("Preference not found");
    this.name = "PreferenceNotFoundError";
  }
}

export class PreferenceKeyLimitError extends Error {
  constructor() {
    super("Preference key limit reached");
    this.name = "PreferenceKeyLimitError";
  }
}

export class PreferenceConflictError extends Error {
  constructor() {
    super("Preference was modified elsewhere");
    this.name = "PreferenceConflictError";
  }
}

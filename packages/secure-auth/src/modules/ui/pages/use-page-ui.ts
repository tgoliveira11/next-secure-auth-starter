"use client";

import type { PasswordPolicyConfig } from "../../../modules/security/password-policy/index.js";
import { mergePasswordPolicy } from "../../../modules/security/password-policy/index.js";
import type { PasswordStrengthFeedbackPosition } from "../../../core/ui-config.js";
import { useSecureAuthUi } from "../secure-auth-ui-provider.js";
import { resolveAuthPaths, type AuthPaths } from "./types.js";

/** Resolves copy: explicit prop → provider message → package default. */
export function useUiMessage(
  prop: string | undefined,
  messageKey: string,
  fallback: string
): string {
  const ui = useSecureAuthUi();
  if (prop !== undefined && prop !== "") return prop;
  return ui?.messages[messageKey] ?? fallback;
}

/** Resolves page title with optional subtitle fallback before provider defaults. */
export function usePageTitle(
  props: { title?: string; subtitle?: string },
  messageKey: string,
  fallback: string
): string {
  if (props.title !== undefined && props.title !== "") return props.title;
  if (props.subtitle !== undefined && props.subtitle !== "") return props.subtitle;
  const ui = useSecureAuthUi();
  return ui?.messages[messageKey] ?? fallback;
}

/** Merges provider paths with page-level overrides. */
export function useUiPaths(overrides?: AuthPaths) {
  const ui = useSecureAuthUi();
  return resolveAuthPaths({ ...ui?.paths, ...overrides });
}

export function useUiAppSlug(prop?: string): string {
  const ui = useSecureAuthUi();
  return prop ?? ui?.appSlug ?? "app";
}

export function useUiAppName(prop?: string): string {
  const ui = useSecureAuthUi();
  return prop ?? ui?.appName ?? "App";
}

/**
 * Resolves effective password policy: explicit prop → provider config → package defaults.
 * Always returns a full `PasswordPolicyConfig` (never `undefined`).
 */
export function useEffectivePasswordPolicy(
  prop?: Partial<PasswordPolicyConfig>
): PasswordPolicyConfig {
  const ui = useSecureAuthUi();
  return mergePasswordPolicy(prop ?? ui?.passwordPolicy);
}

/** @deprecated Use `useEffectivePasswordPolicy` — kept as alias for existing imports. */
export function useUiPasswordPolicy(
  prop?: Partial<PasswordPolicyConfig>
): PasswordPolicyConfig {
  return useEffectivePasswordPolicy(prop);
}

/** Resolves password feedback placement: explicit prop → provider config → package default (`above`). */
export function usePasswordStrengthPosition(
  prop?: PasswordStrengthFeedbackPosition
): PasswordStrengthFeedbackPosition {
  const ui = useSecureAuthUi();
  if (prop !== undefined) return prop;
  return ui?.passwordStrength.position ?? "above";
}

# Generic password components

Reusable password policy UI and validation helpers for **any** sensitive password flow — not only authentication.

Use these when building:

- vault passwords
- encryption passwords
- recovery passwords
- admin/workspace passwords
- any custom setup screen outside login/register/reset

## Imports

```tsx
import {
  PasswordStrengthField,
  PasswordSetupFields,
} from "@tgoliveira/secure-auth/react/client";

import {
  DEFAULT_PASSWORD_POLICY,
  resolvePasswordPolicy,
  validatePasswordAgainstPolicy,
  validatePasswordConfirmation,
  validatePasswordSetup,
  getPasswordPolicyRequirements,
  calculatePasswordStrength,
  type PasswordPolicyConfig,
  type PasswordValidationResult,
  type PasswordSetupValidationResult,
  type PasswordStrength,
  type PasswordStrengthPosition,
} from "@tgoliveira/secure-auth/client/password-policy";
```

The package **never reads environment variables**. Map env in your app and pass `policy` as props.

## Single password field

```tsx
"use client";

import { useState } from "react";
import { PasswordStrengthField } from "@tgoliveira/secure-auth/react/client";

const vaultPasswordPolicy = {
  minLength: 16,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  enforcement: "enforce" as const,
};

export function VaultPasswordField() {
  const [password, setPassword] = useState("");
  const [valid, setValid] = useState(false);

  return (
    <PasswordStrengthField
      id="vault-password"
      name="vaultPassword"
      label="Vault password"
      value={password}
      onChange={setPassword}
      policy={vaultPasswordPolicy}
      feedbackPosition="above"
      onValidityChange={(isValid) => setValid(isValid)}
    />
  );
}
```

## Password + confirmation

```tsx
<PasswordSetupFields
  passwordName="vaultPassword"
  confirmName="confirmVaultPassword"
  passwordLabel="Vault password"
  confirmLabel="Confirm vault password"
  policy={vaultPasswordPolicy}
  feedbackPosition="above"
  onValidityChange={(isValid) => setCanSubmit(isValid)}
/>
```

## Consumer env example

```env
VAULT_PASSWORD_MIN_LENGTH=16
VAULT_PASSWORD_REQUIRE_UPPERCASE=true
VAULT_PASSWORD_REQUIRE_LOWERCASE=true
VAULT_PASSWORD_REQUIRE_NUMBER=true
VAULT_PASSWORD_REQUIRE_SYMBOL=true
```

```ts
export const vaultPasswordPolicy = {
  minLength: Number(process.env.VAULT_PASSWORD_MIN_LENGTH ?? 16),
  requireUppercase: process.env.VAULT_PASSWORD_REQUIRE_UPPERCASE === "true",
  requireLowercase: process.env.VAULT_PASSWORD_REQUIRE_LOWERCASE === "true",
  requireNumber: process.env.VAULT_PASSWORD_REQUIRE_NUMBER === "true",
  requireSymbol: process.env.VAULT_PASSWORD_REQUIRE_SYMBOL === "true",
  enforcement: "enforce" as const,
};
```

## Manual validation before submit

```ts
const result = validatePasswordSetup({
  password,
  confirmation,
  policy: vaultPasswordPolicy,
});

if (!result.valid) {
  // show result.password.messages[0] or result.confirmation.message
  return;
}
```

## Auth pages vs generic components

| Use case | Component | Policy source |
| --- | --- | --- |
| Register / reset / change password (package pages) | Built-in pages or `PasswordSetupFields` | `createSecureAuth(config).passwordPolicy` via `SecureAuthUIProvider` |
| Vault / product-specific passwords | `PasswordStrengthField` / `PasswordSetupFields` from `/react/client` | App-defined `policy` prop |

Generic components do **not** call auth APIs. Pass `policy` explicitly for standalone flows.

## Accessibility

- Labels are associated with inputs.
- Strength/requirements feedback uses `aria-describedby`.
- Confirmation mismatch uses `role="alert"`.
- Feedback regions use `aria-live="polite"` and remain mounted for stable layout (no focus loss while typing).

## Difference from auth-only behavior

Auth pages may still resolve policy from `SecureAuthUIProvider` or `/api/auth/password-policy` when no `policy` prop is passed. Generic `/react/client` usage should always pass `policy` for non-auth flows.

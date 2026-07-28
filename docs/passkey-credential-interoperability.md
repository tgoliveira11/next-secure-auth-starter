# Passkey credential interoperability

`@tgoliveira/secure-auth` can share one WebAuthn credential with an independent browser-only
security feature without taking a dependency on that feature. Account authentication and the
additional capability remain separate security domains.

This contract is opt-in. Standalone secure-auth consumers do not request PRF and behave exactly as
before.

## Security invariants

- Both ceremonies must use the same effective WebAuthn RP ID. Different registrable domains cannot
  reuse a credential. Every accepted origin must still be explicitly configured and verified.
- `passkey_credentials` is the single authority for credential id, public key, revocation,
  signature counter, and monotonic `counter_revision`. Never copy either counter into an independent
  feature table.
- Each server ceremony has a distinct single-use challenge audience: `registration`, `login`,
  `sign_in_capability_enable:<credentialDbId>`, or the consumer's own feature-specific audience.
- One assertion has one authoritative server verifier and one counter/revision compare-and-set. A browser may
  use a local extension result after that verification; a second server must not verify and update
  the same assertion again.
- PRF output and complete PRF client-extension results remain in browser memory. Secure-auth client
  APIs recursively strip documented PRF-derived aliases; secure-auth verification routes reject any
  request graph that still contains them.
- TOTP is completed before an additional local capability runs. `onFullyAuthenticated` is never
  called while two-factor authentication is pending.
- Account authentication never returns a vault key. A local vault unlock never creates an account
  session.

## Public composition hooks

The following exports are available from `@tgoliveira/secure-auth/react/client`:

- `registerAccountPasskey`
- `AccountPasskeyRegistrationHooks`
- `signInWithPasskey`
- `PasskeyLoginHooks`
- `enableAccountPasskeySignIn`

Ready-to-use pages accept the same hooks:

- `SecuritySettingsPage.passkeyRegistrationHooks`
- `PasskeySettings.registrationHooks`
- `LoginPage.passkeyLoginHooks`
- `LoginPasskeySection.hooks`

The **Enable sign-in** action is hidden by default. Set
`SecuritySettingsPage.allowPasskeySignInCapabilityPromotion` or
`PasskeySettings.allowSignInCapabilityPromotion` to `true` only after mounting the promotion route
and completing the product security review.

The preparation callbacks operate on the browser options passed to SimpleWebAuthn. Extension values
may contain `ArrayBuffer`; they are not serialized by the preparation hook. The verified callbacks
receive client-extension results only in the browser.

## One registration ceremony, either entry point

Account-first and feature-first setup use the same orchestration. The UI that starts the operation
calls `registerAccountPasskey` (directly or through `SecuritySettingsPage`), injects its browser
extension in `prepareOptions`, and consumes it only in `onVerified` after secure-auth returns the
exact verified credential id.

```tsx
"use client";

import { SecuritySettingsPage } from "@tgoliveira/secure-auth/react";
import type { AccountPasskeyRegistrationHooks } from "@tgoliveira/secure-auth/react/client";
import {
  prepareVaultPasskeyPrfRegistrationOptions,
  resolvePasskeyPrfEnrollmentAfterRegistration,
} from "@tgoliveira/vault-core/browser";

type Props = {
  userId: string;
  prfSaltPrefix: string;
  persistEnvelope(input: { credentialId: string; prfOutput: Uint8Array }): Promise<void>;
};

export function SecurityPage({ userId, prfSaltPrefix, persistEnvelope }: Props) {
  const hooks: AccountPasskeyRegistrationHooks = {
    prepareOptions: (serverOptions) =>
      prepareVaultPasskeyPrfRegistrationOptions({
        userId,
        prfSaltPrefix,
        serverOptions,
      }),
    onVerified: async ({
      registrationCredentialId,
      verifiedCredentialId,
      clientExtensionResults,
    }) => {
      const enrollment = resolvePasskeyPrfEnrollmentAfterRegistration({
        registrationCredentialId,
        verifiedCredentialId,
        clientExtensionResults,
      });
      if (enrollment.status !== "ready") {
        throw new Error(`Vault PRF enrollment is ${enrollment.status}`);
      }
      try {
        await persistEnvelope({
          credentialId: enrollment.credentialId,
          prfOutput: enrollment.prfOutput,
        });
      } finally {
        enrollment.prfOutput.fill(0);
      }
    },
  };

  return (
    <SecuritySettingsPage
      userId={userId}
      passkeyRegistrationHooks={hooks}
    />
  );
}
```

`persistEnvelope` is app-owned. It must atomically persist the envelope and set
`vault_unlock_enabled = true` on the same credential row. If optional envelope setup fails,
secure-auth reports that account sign-in registration succeeded but the additional integration did
not complete. Retry with an exact authentication ceremony; do not create another credential.

## Existing credentials

### Vault-only to account sign-in

Wire the new route:

```ts
// src/app/api/account/passkeys/[id]/enable-sign-in/route.ts
import { secureAuth } from "@/lib/secure-auth";

export const POST = secureAuth.routes.passkeyEnableSignIn.POST;
```

When explicitly enabled, `PasskeySettings` renders **Enable sign-in** for a credential with
`signInEnabled: false` and `vaultUnlockEnabled: true`. The flow requires:

1. a same-origin, fully authenticated account session (TOTP complete when configured);
2. an exact allow-list containing only that credential;
3. `userVerification: "required"`;
4. a single-use challenge bound to the user, credential database id, and
   `sign_in_capability_enable` audience;
5. signature verification and a successful shared counter/revision compare-and-set;
6. an atomic `sign_in_enabled = true` update and audit event.

It does not re-register the passkey and does not request PRF. The browser helper still performs
generic best-effort sensitive-extension cleanup in a ceremony-wide `finally` block after server
verification, so a future extension request cannot accidentally bypass the lifecycle boundary.

### Account sign-in to browser-only capability

This direction stays consumer-owned. Resolve the account credential by its database id on the
server, generate an exact feature-specific authentication challenge, apply the browser extension
locally, verify the assertion once against the shared credential row, and compare-and-set the same
counter. Persist the new envelope and `vault_unlock_enabled = true` atomically.

## Login plus local unlock

`PasskeyLoginHooks.prepareOptions` may request a browser extension during account login.
`onFullyAuthenticated` runs only after WebAuthn verification and final NextAuth session creation.
The package preserves the complete extension result only until that callback settles and sends a
sanitized copy to the server. It then best-effort zeroes reachable `ArrayBuffer`/view contents and
drops its PRF references. JavaScript garbage collection is nondeterministic, and this cannot erase
copies made by the browser, runtime, or consumer; consumers must zero their own derived buffers.

When login requires TOTP, the callback is not invoked and the local extension result is discarded.
After TOTP, run a new exact feature-specific assertion. Avoiding that second prompt would require a
separately reviewed memory-only handoff across the 2FA UI; localStorage, sessionStorage, IndexedDB,
cookies, URL state, or server persistence are forbidden for PRF output.

## Privacy

Using one credential makes the two capability rows explicitly linkable inside the same account
database. It does not reveal encrypted payloads, wallet addresses, recovery data, or PRF output.
Consumers must keep product identifiers and decrypted content out of credential metadata, audit
events, analytics, logs, and AAD that reaches the account server.

## Consumer-owned security review

```text
TODO_SECURITY_REVIEW_REQUIRED:
Any consumer route that verifies WebAuthn outside secure-auth must prove that it uses the same
authoritative passkey_credentials row and compare-and-set counter/revision, distinct challenge audience,
exact user/credential binding, and no PRF serialization. The package cannot enforce this across an
independent consumer route.
```

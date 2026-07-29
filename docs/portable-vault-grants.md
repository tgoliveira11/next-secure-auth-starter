# Portable vault broker grants

This opt-in module lets one WebAuthn credential authorize an independent portable vault broker
without turning account login into vault unlock. Secure-auth verifies a dedicated, UV-required
assertion and issues a short-lived ES256 grant. It never receives a Portable Unlock Key (PUK), PRF
output, an ephemeral private key, a User Vault Key, or decrypted vault data.

Use this module with the portable broker APIs in `@tgoliveira/vault-core`. Legacy PRF envelopes are
a separate compatibility path and must not be represented as cross-device portable.

## Ownership boundaries

| Owner | Responsibilities |
| --- | --- |
| secure-auth | Account session and completed TOTP gate, credential/public-key ownership, WebAuthn origin/RP/UV verification, counter/revision CAS, grant signing, receipt verification/consumption, capability flag updates |
| vault broker | PUK and KEK custody, encrypted UVK envelope storage, grant JTI consumption, ephemeral-key sealing, completion-receipt signing, retry reconciliation |
| vault-core browser | PUK generation/zeroing, encrypted UVK envelope, non-extractable one-use P-256 session, PUK unseal, non-extractable UVK restore |
| consuming app | Route wiring, broker HTTPS calls, pending/active envelope mapping, vault session lifecycle, UI, deployment configuration, migration execution |

Account login never emits a broker grant. A broker grant never creates or upgrades an account
session. The grant ceremony requires an already fully authenticated account session, including TOTP
when configured.

## Configuration

The feature is absent by default. Enable it only on a deployment registered with the broker:

```typescript
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import { db } from "@/lib/db";
import { emailProvider } from "@/lib/email";

export const secureAuth = createSecureAuth({
  db,
  app: {
    name: "Example",
    slug: "example",
    baseUrl: "https://www.example.com",
  },
  auth: {
    afterLoginPath: "/dashboard",
    afterLogoutPath: "/",
    requireEmailVerificationBeforeSignIn: true,
    nextAuthSecret: process.env.NEXTAUTH_SECRET!,
    twoFactorEncryptionKey: process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY!,
  },
  email: { from: "Example <noreply@example.com>", provider: emailProvider },
  webauthn: {
    rpId: "example.com",
    rpName: "Example",
    origin: "https://www.example.com",
    originAliasPolicy: "none",
    portableVaultGrants: {
      enabled: true,
      issuer: "https://www.example.com",
      appId: "example",
      audience: "https://vault-broker.example.com",
      ttlSeconds: 60,
      opaqueSubjectKey: process.env.PORTABLE_VAULT_SUBJECT_KEY!,
      grantPrivateJwkB64: process.env.PORTABLE_VAULT_GRANT_PRIVATE_JWK_B64!,
      brokerReceiptIssuer: "https://vault-broker.example.com",
      brokerReceiptPublicJwksB64:
        process.env.PORTABLE_VAULT_BROKER_RECEIPT_PUBLIC_JWKS_B64!,
    },
  },
});
```

`grantPrivateJwkB64` is base64url-encoded JSON for one private P-256 signing JWK. The matching
public JWK is registered with the broker. `brokerReceiptPublicJwksB64` is base64url-encoded JSON for
an array of active broker P-256 public JWKs, which allows receipt-key rotation. Every JWK requires a
unique `kid`; `alg`, when present, is `ES256`.

Use different grant/receipt key pairs, broker KEKs, databases, issuers, and audiences in Production
and Preview. Base64url JSON avoids deployment platforms truncating raw JSON environment values at
the first `{`. Never expose the private grant JWK or opaque-subject HMAC key to a client bundle.

`opaqueSubjectKey` is canonical base64url for 32–64 random bytes. Secure-auth derives a stable,
app-scoped pseudonymous UUID from it and the internal user ID; the broker never receives an email or
raw application user ID.

Apply `0005_nasty_slipstream.sql` before enabling the feature.

## Route wiring

```typescript
// app/api/account/passkeys/portable-vault-grants/options/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.passkeyPortableVaultGrantOptions.POST;

// app/api/account/passkeys/portable-vault-grants/verify/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.passkeyPortableVaultGrantVerify.POST;

// app/api/account/passkeys/portable-vault-grants/finalize/route.ts
import { secureAuth } from "@/lib/secure-auth";
export const POST = secureAuth.routes.passkeyPortableVaultGrantFinalize.POST;
```

All three routes require same-origin requests and a fully authenticated account session. Operations
are bound to that exact account-session row, expire quickly, and are single-use.

## Grant contract

`requestPortableVaultGrant()` runs a new assertion against exactly one active credential with
`userVerification: "required"`. It returns a compact ES256 JWS only after signature verification and
an atomic WebAuthn counter/revision update.

`passkeyAccountApi.list()` returns both the database `id` used as `credentialDbId` in grant requests
and the WebAuthn `credentialId`. The latter lets a post-login hook correlate its
`verifiedCredentialId` with the exact account-list item without browser storage or a copied user
hint.

The JWT uses standard `iss`, `aud`, `sub`, `jti`, `iat`, and `exp` claims plus:

| Claim | Contract |
| --- | --- |
| `purpose` | Exact `portable_vault` |
| `action` | Exact `enroll`, `unlock`, or `revoke` |
| `app_id` | Broker registration ID |
| `credential_id` | Exact verified WebAuthn credential ID |
| `request_id` | UUID for this single operation; echoed by the broker and receipt |
| `uv` | Literal `true` |
| `auth_time` | Time of this dedicated assertion, not account-login time |
| `envelope_id` | Required for unlock/revoke; omitted for enroll because the broker creates it |
| `epk_thumbprint` | Required for unlock; RFC 7638 thumbprint of the browser's one-use P-256 public JWK |

The configured lifetime is 15–120 seconds. A login assertion, login token, session cookie alone,
or a previous grant cannot authorize a vault action.

## Enrollment

Enrollment begins only while the vault is already unlocked through password, recovery, or another
verified method. The app creates the vault-core enrollment package in the browser, requests an
`enroll` grant for the selected credential, and sends the package directly to the broker over TLS.

After the broker response, stage its opaque envelope ID and vault-core opaque AAD scope as
**pending** app data. Then call:

```typescript
import { passkeyPortableVaultGrantApi } from "@tgoliveira/secure-auth/client";

const finalized = await passkeyPortableVaultGrantApi.finalizeReceipt(completionReceipt);
if (
  finalized.action !== "enroll" ||
  finalized.requestId !== grantResult.requestId ||
  finalized.envelopeId !== brokerResponse.envelopeId
) {
  throw new Error("Portable vault enrollment receipt mismatch");
}
```

Only after this succeeds may the app mark its pending mapping active. Secure-auth sets
`vault_unlock_enabled = true` only while consuming the exact signed receipt. If the network or app
stops between those steps, start a **new** enroll grant; the broker reconciles the existing active
subject/credential envelope and returns a new receipt. Do not reuse a grant or receipt.

## Unlock

Create a fresh vault-core non-extractable P-256 session for every attempt and pass its public JWK to
the grant helper:

```typescript
import {
  passkeyPortableVaultGrantApi,
  requestPortableVaultGrant,
} from "@tgoliveira/secure-auth/client";
import {
  createPortableVaultBrokerUnlockSession,
  unlockPortableVaultBrokerResponse,
} from "@tgoliveira/vault-core/browser";

const session = await createPortableVaultBrokerUnlockSession();
const grantResult = await requestPortableVaultGrant({
  action: "unlock",
  credentialDbId,
  envelopeId,
  ephemeralPublicKeyJwk: session.publicJwk,
});

const brokerResponse = await fetch(`${brokerUrl}/api/v1/envelopes/unlock`, {
  method: "POST",
  headers: { authorization: `Bearer ${grantResult.grant}`, "content-type": "application/json" },
  body: JSON.stringify({ envelopeId, ephemeralPublicJwk: session.publicJwk }),
});
const unlocked = await unlockPortableVaultBrokerResponse({
  response: await brokerResponse.json(),
  session,
  expectedOpaqueScope,
  profile,
});
if (unlocked.status !== "unlocked" || unlocked.requestId !== grantResult.requestId) {
  throw new Error("Portable vault unlock failed");
}

const finalized = await passkeyPortableVaultGrantApi.finalizeReceipt(
  unlocked.completionReceipt
);
if (
  finalized.action !== "unlock" ||
  finalized.requestId !== grantResult.requestId ||
  finalized.envelopeId !== envelopeId
) {
  throw new Error("Portable vault unlock receipt mismatch");
}
// Only now install unlocked.vaultKey through the app's owner-scoped vault session lifecycle.
```

Never retry with the same ephemeral session. Dispose it on any failure. The secure-auth client strips
PRF-derived extension results before serialization and releases them after the ceremony; the server
also rejects a request graph containing PRF aliases.

## Revoke and account deletion

Request a `revoke` grant with the exact credential database ID and broker envelope UUID, call the
broker revoke endpoint, then finalize its receipt. Secure-auth consumes the receipt and sets
`vault_unlock_enabled = false`. If the credential has no sign-in capability, it is also soft-revoked;
a dual-capability credential remains valid for account login.

Mark the app envelope mapping revoked only after successful finalization. A retry uses a new grant;
the broker reconciles an already-revoked envelope.

Account deletion fails with HTTP 409 while any active credential has
`vault_unlock_enabled = true`. Complete broker revocation first so deletion cannot orphan an active
portable envelope.

## Acceptance checklist

- Grant and receipt algorithms are exactly ES256 with expected `kid` and `typ: JWT`.
- Production and Preview use separate keys, broker state, issuers, audiences, and origins.
- TOTP-complete account session is required before every grant ceremony.
- WebAuthn allow-list contains exactly the selected credential and UV is required and verified.
- Grant `request_id`, JTI, action, credential, envelope (when applicable), and JKT (unlock) match.
- Grant challenge, broker grant JTI, and secure-auth receipt JTI are each consumed once.
- Receipt issuer, audience, app, subject, credential, action, request, grant JTI, and envelope match.
- PRF output, PUK, ephemeral private keys, UVKs, and decrypted payloads never reach secure-auth.
- The UVK remains non-extractable and is installed only after unlock receipt finalization.
- Interrupted enroll/revoke is reconciled with a new grant, never by replaying the old proof.

"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { OAuthSignInError } from "./oauth-sign-in-error.js";
import { LoginCredentialsError } from "./login-credentials-error.js";
import { TurnstileCaptcha } from "./turnstile-captcha.js";
import { MagicLinkSignInSection } from "./magic-link-sign-in-section.js";
import { LoginPasskeySection } from "./login-passkey-section.js";
import { SocialSignIn } from "./social-sign-in.js";
import { useCaptchaForPage, useUiMessage } from "../../pages/use-page-ui.js";
import {
  ForgotPasswordLink,
  LOGIN_CONTINUE_BUTTON_ID,
  LOGIN_FORM_ID,
  LOGIN_PASSWORD_BLOCK_ID,
  LOGIN_PASSWORD_FIELD_ID,
  LOGIN_SUBMIT_BUTTON_ID,
  LoginEmailField,
  LoginPasswordField,
  loginSubmitButtonClassName,
} from "./login-form-fields.js";
import type { PasskeyLoginHooks } from "@tgoliveira/secure-auth/react/client";

export type TwoStepLoginStep = "email" | "password";

export type TwoStepLoginPanelProps = {
  appSlug: string;
  loginAction?: string;
  forgotPasswordPath?: string;
  forgotPasswordLinkLabel?: string;
  submitLabel?: string;
  continueLabel?: string;
  afterLoginPath?: string;
  loginTwoFactorPath?: string;
  passkeyLoginHooks?: PasskeyLoginHooks;
};

/**
 * Reveals password and passkey sign-in only after the account email is entered.
 *
 * The step transition is client-side by design: asking the server whether an email exists
 * before authentication would turn the login page into a user-enumeration oracle. The
 * submitted payload is unchanged (`email` + `password` in one POST), so no server route,
 * cookie, or rate-limit behavior differs from the single-step layout.
 */
export function TwoStepLoginPanel({
  appSlug,
  loginAction = "/login",
  forgotPasswordPath = "/forgot-password",
  forgotPasswordLinkLabel,
  submitLabel = "Sign in with email",
  continueLabel,
  afterLoginPath = "/dashboard",
  loginTwoFactorPath = "/login/2fa?mode=credentials",
  passkeyLoginHooks,
}: TwoStepLoginPanelProps) {
  const captcha = useCaptchaForPage("login");
  const [step, setStep] = useState<TwoStepLoginStep>("email");
  const [email, setEmail] = useState("");
  const resolvedContinueLabel = useUiMessage(continueLabel, "loginContinueLabel", "Continue");
  const changeEmailLabel = useUiMessage(
    undefined,
    "loginChangeEmailLabel",
    "Use a different email"
  );
  const passwordStepDescription = useUiMessage(
    undefined,
    "loginPasswordStepDescription",
    "Enter your password to finish signing in."
  );
  const draftKey = `secure-auth:${appSlug}:login-email-draft`;

  // A failed POST is a full navigation back to /login?error=…, which drops React state.
  // Restore the password step from the session-scoped draft so the user is not sent back
  // to step one. The email is never placed in the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasError = new URLSearchParams(window.location.search).has("error");
    if (!hasError) return;
    const draft = window.sessionStorage.getItem(draftKey);
    if (!draft) return;
    setEmail(draft);
    setStep("password");
  }, [draftKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (step === "password") return;
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setEmail(trimmed);
    try {
      window.sessionStorage.setItem(draftKey, trimmed);
    } catch {
      // Private-mode storage failures must not block sign-in.
    }
    setStep("password");
  }

  function backToEmailStep() {
    const passwordInput = document.getElementById(
      LOGIN_PASSWORD_FIELD_ID
    ) as HTMLInputElement | null;
    if (passwordInput) passwordInput.value = "";
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // Ignore storage failures.
    }
    setStep("email");
  }

  const onPasswordStep = step === "password";

  return (
    <>
      <form
        id={LOGIN_FORM_ID}
        action={loginAction}
        method="post"
        className="space-y-4"
        autoComplete="on"
        onSubmit={handleSubmit}
      >
        {/* Without JavaScript the step never advances, so reveal the full credentials form. */}
        <noscript>
          <style>{`#${LOGIN_PASSWORD_BLOCK_ID}{display:block !important}#${LOGIN_SUBMIT_BUTTON_ID}{display:block !important}#${LOGIN_CONTINUE_BUTTON_ID}{display:none !important}`}</style>
        </noscript>

        <LoginEmailField
          value={email}
          onChange={setEmail}
          readOnly={onPasswordStep}
          autoFocus={!onPasswordStep}
        />

        {onPasswordStep && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--muted)]">{passwordStepDescription}</span>
            <button
              type="button"
              onClick={backToEmailStep}
              className="shrink-0 font-medium text-[var(--primary)] hover:underline"
            >
              {changeEmailLabel}
            </button>
          </div>
        )}

        <div id={LOGIN_PASSWORD_BLOCK_ID} hidden={!onPasswordStep} className="space-y-4">
          <LoginPasswordField required={onPasswordStep} autoFocus={onPasswordStep} />
        </div>

        <ForgotPasswordLink href={forgotPasswordPath} label={forgotPasswordLinkLabel} />

        <Suspense fallback={null}>
          <OAuthSignInError />
          <LoginCredentialsError />
        </Suspense>

        {onPasswordStep && captcha.required && <TurnstileCaptcha siteKey={captcha.siteKey} />}

        <button
          id={LOGIN_CONTINUE_BUTTON_ID}
          type="submit"
          hidden={onPasswordStep}
          className={loginSubmitButtonClassName}
        >
          {resolvedContinueLabel}
        </button>
        <button
          id={LOGIN_SUBMIT_BUTTON_ID}
          type="submit"
          hidden={!onPasswordStep}
          className={loginSubmitButtonClassName}
        >
          {submitLabel}
        </button>
      </form>

      {onPasswordStep ? (
        <LoginPasskeySection
          appSlug={appSlug}
          afterLoginPath={afterLoginPath}
          loginPath={loginAction}
          loginTwoFactorPath={loginTwoFactorPath}
          hooks={passkeyLoginHooks}
          showSocialSignIn={false}
          emailKnown
        />
      ) : (
        <>
          <MagicLinkSignInSection />
          <SocialSignIn afterLoginPath={afterLoginPath} />
        </>
      )}
    </>
  );
}

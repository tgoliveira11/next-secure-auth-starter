export const CAPTCHA_TOKEN_FIELD = "captchaToken" as const;

export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const CAPTCHA_USER_MESSAGE =
  "Please complete the verification challenge and try again.";

export type CaptchaFlow = "register" | "login";

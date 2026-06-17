"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CAPTCHA_TOKEN_FIELD } from "@/modules/captcha/lib/constants.js";

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | undefined;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-secure-auth-turnstile="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.secureAuthTurnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export type TurnstileCaptchaProps = {
  siteKey: string;
  inputName?: string;
  onTokenChange?: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
  resetSignal?: number;
  className?: string;
};

export function TurnstileCaptcha({
  siteKey,
  inputName = CAPTCHA_TOKEN_FIELD,
  onTokenChange,
  onExpired,
  onError,
  resetSignal = 0,
  className,
}: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const inputId = useId();
  const [token, setToken] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function mountWidget() {
      await loadTurnstileScript();
      if (cancelled || !containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (value) => {
          setToken(value);
          onTokenChange?.(value);
        },
        "expired-callback": () => {
          setToken("");
          onTokenChange?.("");
          onExpired?.();
        },
        "error-callback": () => {
          setToken("");
          onTokenChange?.("");
          onError?.();
        },
      });
    }

    void mountWidget();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onTokenChange, onExpired, onError]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile || resetSignal === 0) return;
    window.turnstile.reset(widgetIdRef.current);
    setToken("");
    onTokenChange?.("");
  }, [resetSignal, onTokenChange]);

  return (
    <div className={className}>
      <div ref={containerRef} aria-label="Verification challenge" />
      <input type="hidden" id={inputId} name={inputName} value={token} readOnly />
    </div>
  );
}

/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SecureAuthUIProvider } from "../../secure-auth-ui-provider";
import { DEFAULT_AUTH_PATHS } from "../types";
import { DEFAULT_TEST_PUBLIC_AUTH } from "@/test/helpers/default-public-auth";
import type { SecureAuthUIPublicConfig } from "@/core/ui-config";
import {
  useCaptchaForPage,
  useEffectivePasswordPolicy,
  usePageTitle,
  usePasswordStrengthPosition,
  useUiAppName,
  useUiAppSlug,
  useUiMessage,
  useUiPaths,
  useUiPasswordPolicy,
} from "../use-page-ui";

function uiConfig(overrides: Partial<SecureAuthUIPublicConfig> = {}): SecureAuthUIPublicConfig {
  return {
    appSlug: "provider-slug",
    appName: "Provider App",
    paths: { ...DEFAULT_AUTH_PATHS, login: "/custom-login" },
    messages: { loginTitle: "Provider login" },
    passwordPolicy: {
      enforcement: "warn",
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSymbol: false,
      blockCommonPasswords: true,
      minScore: 3,
    },
    passwordStrength: { position: "below" },
    auth: DEFAULT_TEST_PUBLIC_AUTH,
    sessionPolicy: { singleActiveSession: false, revocationPollIntervalSeconds: 0 },
    captcha: {
      provider: "turnstile",
      siteKey: "site-key",
      pages: { register: true, login: false },
    },
    ...overrides,
  };
}

function wrapper(config?: SecureAuthUIPublicConfig | null) {
  return function Provider({ children }: { children: ReactNode }) {
    return <SecureAuthUIProvider config={config}>{children}</SecureAuthUIProvider>;
  };
}

describe("use-page-ui hooks", () => {
  it("useUiMessage prefers explicit prop, then provider, then fallback", () => {
    const { result: withProp } = renderHook(
      () => useUiMessage("Explicit", "loginTitle", "Fallback"),
      { wrapper: wrapper(uiConfig()) }
    );
    expect(withProp.current).toBe("Explicit");

    const { result: fromProvider } = renderHook(
      () => useUiMessage(undefined, "loginTitle", "Fallback"),
      { wrapper: wrapper(uiConfig()) }
    );
    expect(fromProvider.current).toBe("Provider login");

    const { result: fallback } = renderHook(
      () => useUiMessage(undefined, "missing", "Fallback"),
      { wrapper: wrapper(null) }
    );
    expect(fallback.current).toBe("Fallback");
  });

  it("usePageTitle resolves title, subtitle, provider, and fallback", () => {
    const { result: title } = renderHook(
      () => usePageTitle({ title: "Title" }, "loginTitle", "Fallback"),
      { wrapper: wrapper(uiConfig()) }
    );
    expect(title.current).toBe("Title");

    const { result: subtitle } = renderHook(
      () => usePageTitle({ subtitle: "Subtitle" }, "loginTitle", "Fallback"),
      { wrapper: wrapper(uiConfig()) }
    );
    expect(subtitle.current).toBe("Subtitle");

    const { result: provider } = renderHook(
      () => usePageTitle({}, "loginTitle", "Fallback"),
      { wrapper: wrapper(uiConfig()) }
    );
    expect(provider.current).toBe("Provider login");
  });

  it("useUiPaths merges provider paths with overrides", () => {
    const { result } = renderHook(() => useUiPaths({ register: "/join" }), {
      wrapper: wrapper(uiConfig()),
    });
    expect(result.current.login).toBe("/custom-login");
    expect(result.current.register).toBe("/join");
  });

  it("useUiAppSlug and useUiAppName resolve props and provider defaults", () => {
    const { result: slug } = renderHook(() => useUiAppSlug(), {
      wrapper: wrapper(uiConfig()),
    });
    expect(slug.current).toBe("provider-slug");

    const { result: slugProp } = renderHook(() => useUiAppSlug("override"), {
      wrapper: wrapper(null),
    });
    expect(slugProp.current).toBe("override");

    const { result: nameFallback } = renderHook(() => useUiAppName(), {
      wrapper: wrapper(null),
    });
    expect(nameFallback.current).toBe("App");
  });

  it("useEffectivePasswordPolicy and alias merge provider policy", () => {
    const { result } = renderHook(() => useEffectivePasswordPolicy(), {
      wrapper: wrapper(uiConfig()),
    });
    expect(result.current.minLength).toBe(12);

    const { result: alias } = renderHook(() => useUiPasswordPolicy({ minLength: 8 }), {
      wrapper: wrapper(uiConfig()),
    });
    expect(alias.current.minLength).toBe(8);
  });

  it("usePasswordStrengthPosition prefers prop then provider default", () => {
    const { result: provider } = renderHook(() => usePasswordStrengthPosition(), {
      wrapper: wrapper(uiConfig()),
    });
    expect(provider.current).toBe("below");

    const { result: prop } = renderHook(() => usePasswordStrengthPosition("above"), {
      wrapper: wrapper(uiConfig()),
    });
    expect(prop.current).toBe("above");
  });

  it("useCaptchaForPage returns required config only when enabled for page", () => {
    const { result: register } = renderHook(() => useCaptchaForPage("register"), {
      wrapper: wrapper(uiConfig()),
    });
    expect(register.current).toEqual({
      required: true,
      siteKey: "site-key",
      provider: "turnstile",
    });

    const { result: login } = renderHook(() => useCaptchaForPage("login"), {
      wrapper: wrapper(uiConfig()),
    });
    expect(login.current).toEqual({ required: false });

    const { result: noCaptcha } = renderHook(() => useCaptchaForPage("login"), {
      wrapper: wrapper(uiConfig({ captcha: undefined })),
    });
    expect(noCaptcha.current).toEqual({ required: false });
  });
});

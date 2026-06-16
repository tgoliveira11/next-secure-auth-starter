"use client";

import { useEffect, useMemo, useState } from "react";
import {
  mergePasswordPolicy,
  type PasswordPolicyConfig,
} from "@tgoliveira/secure-auth/client/password-policy";
import { useSecureAuthUi } from "../../secure-auth-ui-provider.js";
import { useEffectivePasswordPolicy } from "../../pages/use-page-ui.js";

type ResolvedPasswordPolicy = {
  policy: PasswordPolicyConfig;
  /** True while waiting for `/api/auth/password-policy` when no prop or provider policy exists. */
  isLoading: boolean;
};

/**
 * Resolves password policy for password inputs.
 * Uses provider/prop synchronously; falls back to the password-policy API when neither is set.
 */
export function useResolvedPasswordPolicy(
  prop?: Partial<PasswordPolicyConfig>
): ResolvedPasswordPolicy {
  const ui = useSecureAuthUi();
  const staticPolicy = useEffectivePasswordPolicy(prop);
  const shouldFetchFromApi = prop === undefined && ui?.passwordPolicy === undefined;

  const [fetchedPolicy, setFetchedPolicy] = useState<PasswordPolicyConfig | null>(null);
  const [fetchSettled, setFetchSettled] = useState(!shouldFetchFromApi);

  useEffect(() => {
    if (!shouldFetchFromApi) {
      return;
    }

    let cancelled = false;
    fetch("/api/auth/password-policy")
      .then((response) => (response.ok ? response.json() : null))
      .then((config: PasswordPolicyConfig | null) => {
        if (!cancelled && config) {
          setFetchedPolicy(mergePasswordPolicy(config));
        }
      })
      .catch(() => {
        // Fall back to package defaults after fetch failure.
      })
      .finally(() => {
        if (!cancelled) {
          setFetchSettled(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shouldFetchFromApi]);

  const policy = useMemo(() => {
    if (!shouldFetchFromApi) {
      return staticPolicy;
    }
    if (fetchedPolicy) {
      return fetchedPolicy;
    }
    return staticPolicy;
  }, [fetchedPolicy, shouldFetchFromApi, staticPolicy]);

  return {
    policy,
    isLoading: shouldFetchFromApi && !fetchSettled && !fetchedPolicy,
  };
}

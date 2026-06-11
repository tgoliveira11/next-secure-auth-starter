"use client";

import { useEffect, useRef } from "react";

/**
 * Password managers (Enpass, 1Password, etc.) often call HTMLFormElement.submit(),
 * which bypasses React's onSubmit handler. Redirect submit() to requestSubmit() so
 * the React submit handler always runs.
 */
export function usePasswordManagerFormSubmit<T extends HTMLFormElement>() {
  const formRef = useRef<T | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form || typeof form.requestSubmit !== "function") return;

    const nativeSubmit = form.submit.bind(form);
    form.submit = () => {
      form.requestSubmit();
    };

    return () => {
      if (formRef.current === form) {
        form.submit = nativeSubmit;
      }
    };
  }, []);

  return formRef;
}

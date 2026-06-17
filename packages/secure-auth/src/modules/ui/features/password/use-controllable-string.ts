"use client";

import { useCallback, useState } from "react";

export function useControllableString(
  value: string | undefined,
  defaultValue: string | undefined,
  onChange?: (value: string) => void
) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const current = isControlled ? value : uncontrolled;

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolled(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  return [current, setValue] as const;
}

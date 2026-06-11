import { cn } from "../lib/cn";

type AppMarkProps = {
  className?: string;
  size?: number;
};

/** Generic starter brand mark (matches src/app/icon.svg). */
export function AppMark({ className, size = 28 }: AppMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="#1e3a5f" />
      <path d="M16 8l7 4v8l-7 4-7-4v-8l7-4z" fill="#faf8f5" />
      <circle cx="16" cy="16" r="3" fill="#3b82f6" />
    </svg>
  );
}

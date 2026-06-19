import { MAIN_CONTENT_ID } from "@tgoliveira/secure-auth/client";

export function SkipLink() {
  return (
    <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
      Skip to content
    </a>
  );
}

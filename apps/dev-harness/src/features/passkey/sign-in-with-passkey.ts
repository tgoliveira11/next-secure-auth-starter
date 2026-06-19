export {
  signInWithPasskey,
  isPasskeyLoginSupported,
  getPasskeyLoginUnsupportedMessage,
  buildPasskeyLoginOutcomeKey,
  type PasskeyLoginOutcome,
} from "@tgoliveira/secure-auth/react/client";

import { buildPasskeyLoginOutcomeKey } from "@tgoliveira/secure-auth/react/client";
import { APP_SLUG } from "@/lib/brand";

/** Session storage key for passkey login outcome tracking in the starter app. */
export const PASSKEY_LOGIN_OUTCOME_KEY = buildPasskeyLoginOutcomeKey(APP_SLUG);

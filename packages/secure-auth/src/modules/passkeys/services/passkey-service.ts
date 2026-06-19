export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ChallengeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChallengeError";
  }
}

export { PasskeyAccountBoundaryError } from "../lib/passkey-capabilities.js";

export { RateLimitError } from "@/modules/rate-limit/index";
import { CAPTCHA_USER_MESSAGE } from "./lib/constants.js";

export class CaptchaVerificationError extends Error {
  constructor(message = CAPTCHA_USER_MESSAGE) {
    super(message);
    this.name = "CaptchaVerificationError";
  }
}

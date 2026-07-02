import { FormField } from "../../primitives/form-field.js";
import { Input } from "../../primitives/input.js";

const usernameAssociationClassName =
  "pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0";

export type TwoFactorOtpFieldsProps = {
  /** Helps password managers associate the OTP field with the saved login item. */
  usernameEmail?: string;
};

export function TwoFactorOtpFields({ usernameEmail }: TwoFactorOtpFieldsProps) {
  return (
    <>
      {usernameEmail ? (
        <input
          type="email"
          name="username"
          autoComplete="username"
          defaultValue={usernameEmail}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className={usernameAssociationClassName}
        />
      ) : null}

      <FormField id="login-2fa-code" label="Authenticator code">
        <Input
          id="login-2fa-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          required
        />
      </FormField>

      <FormField id="login-2fa-backup" label="Backup code (optional)">
        <Input id="login-2fa-backup" name="backupCode" autoComplete="off" />
      </FormField>
    </>
  );
}

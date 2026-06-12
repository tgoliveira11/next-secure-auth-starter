import { StarterShell } from "@/components/layout/starter-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <StarterShell>{children}</StarterShell>;
}

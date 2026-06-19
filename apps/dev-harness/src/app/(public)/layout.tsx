import { StarterShell } from "@/components/layout/starter-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <StarterShell>{children}</StarterShell>;
}

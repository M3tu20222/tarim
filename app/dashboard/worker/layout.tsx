import type { ReactNode } from "react";

// Add route segment config to explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';

export default function WorkerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

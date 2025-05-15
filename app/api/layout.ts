// Add route segment config to explicitly mark all API routes as dynamic
export const dynamic = 'force-dynamic';

export default function ApiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen max-w-full items-center justify-center bg-muted/40 px-4 py-6 md:px-8">
      <div className="w-full max-w-full min-w-0 sm:max-w-md">{children}</div>
    </div>
  );
}

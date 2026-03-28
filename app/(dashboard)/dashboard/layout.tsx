import { AppSidebar } from "@/components/dashboard/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

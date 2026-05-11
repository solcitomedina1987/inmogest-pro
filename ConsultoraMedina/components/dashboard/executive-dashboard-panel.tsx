import { getExecutiveDashboardData } from "@/app/actions/dashboard-metrics";
import { ExecutiveWidgetsGrid } from "@/components/dashboard/executive-widgets-grid";

export async function ExecutiveDashboardPanel() {
  const data = await getExecutiveDashboardData();
  if (!data) return null;

  return (
    <div className="max-w-full space-y-8">
      <ExecutiveWidgetsGrid data={data} />
    </div>
  );
}

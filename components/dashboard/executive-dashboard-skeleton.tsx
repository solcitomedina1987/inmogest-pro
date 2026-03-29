import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ExecutiveDashboardSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4 xl:gap-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-9 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border shadow-sm">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
          <Skeleton className="h-9 w-44" />
        </CardContent>
      </Card>
    </div>
  );
}

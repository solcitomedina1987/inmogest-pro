import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ExecutiveDashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* 4 widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-9 rounded-lg" />
            </CardHeader>
            <CardContent className="pb-5">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="mt-1.5 h-3 w-36" />
              <div className="mt-3 space-y-1.5 border-t pt-2.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Panel atención */}
      <Card className="border shadow-sm">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
          <Skeleton className="h-9 w-44" />
        </CardContent>
      </Card>
    </div>
  );
}

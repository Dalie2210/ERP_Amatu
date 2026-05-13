import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardCardState } from "@/types";
import type { LucideIcon } from "lucide-react";

type StatCardProps<T> = {
  title: string;
  icon: LucideIcon;
  state: DashboardCardState<T>;
  format: (value: T) => string;
  description: string;
  emptyHint?: string;
};

export function StatCard<T>({
  title,
  icon: Icon,
  state,
  format,
  description,
  emptyHint,
}: StatCardProps<T>) {
  const isError = state.status === "error";
  const isEmpty = !isError && (state.value === null || state.value === 0);

  const display = isError
    ? "No disponible"
    : isEmpty
    ? "—"
    : format(state.value as T);

  const footerText = isError
    ? "Reintenta más tarde"
    : isEmpty && emptyHint
    ? emptyHint
    : description;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold font-heading ${
            isError ? "text-muted-foreground" : ""
          }`}
        >
          {display}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{footerText}</p>
      </CardContent>
    </Card>
  );
}

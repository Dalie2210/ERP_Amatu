import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
}

export function QuickActions({ actions, title = "Acciones Rápidas" }: QuickActionsProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm transition-all"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-medium leading-tight">{action.label}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </div>
              {action.description && (
                <p className="text-xs text-muted-foreground leading-tight">{action.description}</p>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

interface StatusBadgeProps extends Omit<ComponentProps<typeof Badge>, "variant"> {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}

export function StatusBadge({
  active,
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground",
        className
      )}
      {...props}
    >
      {active ? activeLabel : inactiveLabel}
    </Badge>
  )
}

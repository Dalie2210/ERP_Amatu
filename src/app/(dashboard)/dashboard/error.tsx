"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] page-level error", error);
  }, [error]);

  return (
    <div className="max-w-[1440px] mx-auto">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-heading">
            No pudimos cargar el dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ocurrió un error inesperado al consultar la operación. Puedes reintentar a continuación.
          </p>
          <Button onClick={reset} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

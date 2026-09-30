import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigurationNoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "warning" | "info";
}

export function ConfigurationNotice({
  title,
  description,
  action,
  variant = "warning",
  className,
  ...props
}: ConfigurationNoticeProps) {
  return (
    <div
      role={variant === "warning" ? "alert" : "status"}
      className={cn(
        "flex flex-col gap-3 rounded-md border-l-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        variant === "warning"
          ? "border-l-warning border-warning/35 bg-warning/10"
          : "border-l-info border-info/35 bg-info/10",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertCircle
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            variant === "warning" ? "text-warning-foreground" : "text-info",
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {description && (
            <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 sm:self-center">{action}</div>}
    </div>
  );
}
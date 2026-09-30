import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigurationPanelProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  contentClassName?: string;
}

export function ConfigurationPanel({
  title,
  description,
  icon: Icon,
  actions,
  collapsible = false,
  defaultOpen = true,
  className,
  contentClassName,
  children,
  ...props
}: ConfigurationPanelProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <section
      className={cn("overflow-hidden rounded-lg border bg-card shadow-token-sm", className)}
      {...props}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b bg-[hsl(var(--table-head))] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {collapsible && (
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
              aria-controls={contentId}
              aria-expanded={open}
              aria-label={open ? "Contraer sección" : "Expandir sección"}
              onClick={() => setOpen((current) => !current)}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div id={contentId} className={cn("space-y-5 p-4 sm:p-5", contentClassName)}>
          {children}
        </div>
      )}
    </section>
  );
}
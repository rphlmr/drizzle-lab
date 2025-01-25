import { cn } from "@repo/ui/utils/cn";
import { Icon } from "./icons";

export function DrizzleVisualizerLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "dzl-flex dzl-w-full dzl-flex-wrap dzl-items-center dzl-justify-center dzl-gap-2 dzl-bg-[#0f0f14] dzl-px-2 dzl-py-1",
        className,
      )}
    >
      <Icon name="key-round" size="xs" className="dzl-text-green">
        <span className="dzl-shrink-0 dzl-text-xs dzl-text-muted-foreground">
          Primary key
        </span>
      </Icon>
      <Icon name="link" size="xs" className="dzl-text-green">
        <span className="dzl-shrink-0 dzl-text-xs dzl-text-muted-foreground">
          Foreign key
        </span>
      </Icon>
      <Icon name="shield-check" size="xs" className="dzl-text-green">
        <span className="dzl-shrink-0 dzl-text-xs dzl-text-muted-foreground">
          Check
        </span>
      </Icon>
      <Icon name="lock" size="xs" className="dzl-text-green">
        <span className="dzl-shrink-0 dzl-text-xs dzl-text-muted-foreground">
          RLS Policy
        </span>
      </Icon>
      <Icon name="cable" size="xs" className="dzl-text-green">
        <span className="dzl-shrink-0 dzl-text-xs dzl-text-muted-foreground">
          Drizzle relation
        </span>
      </Icon>
      <Icon name="badge-check" size="xs" className="text-secondary-foreground">
        <span className="dzl-shrink-0 dzl-text-xs dzl-text-muted-foreground">
          Unique
        </span>
      </Icon>
      <Icon
        name="diamond"
        size="xs"
        className="dzl-fill-secondary-foreground dzl-text-secondary-foreground"
      >
        <span className="dzl-shrink-0 dzl-text-xs dzl-text-muted-foreground">
          Non-null
        </span>
      </Icon>
      <Icon name="diamond" size="xs" className="dzl-text-secondary-foreground">
        <span className="dzl-shrink-0 dzl-text-xs dzl-text-muted-foreground">
          Nullable
        </span>
      </Icon>
    </div>
  );
}

import { Icon } from "@repo/ui/components/icon";
import { cn } from "@repo/ui/utils/cn";

export function DrizzleVisualizerLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-2 bg-[#0f0f14] px-2 py-1",
        className,
      )}
    >
      <Icon name="key-round" size="xs" className="text-green">
        <span className="shrink-0 text-xs text-muted-foreground">
          Primary key
        </span>
      </Icon>
      <Icon name="link" size="xs" className="text-green">
        <span className="shrink-0 text-xs text-muted-foreground">
          Foreign key
        </span>
      </Icon>
      <Icon name="shield-check" size="xs" className="text-green">
        <span className="shrink-0 text-xs text-muted-foreground">Check</span>
      </Icon>
      <Icon name="lock" size="xs" className="text-green">
        <span className="shrink-0 text-xs text-muted-foreground">
          RLS Policy
        </span>
      </Icon>
      <Icon name="cable" size="xs" className="text-green">
        <span className="shrink-0 text-xs text-muted-foreground">
          Drizzle relation
        </span>
      </Icon>
      <Icon name="badge-check" size="xs" className="text-secondary-foreground">
        <span className="shrink-0 text-xs text-muted-foreground">Unique</span>
      </Icon>
      <Icon
        name="diamond"
        size="xs"
        className="fill-secondary-foreground text-secondary-foreground"
      >
        <span className="shrink-0 text-xs text-muted-foreground">Non-null</span>
      </Icon>
      <Icon name="diamond" size="xs" className="text-secondary-foreground">
        <span className="shrink-0 text-xs text-muted-foreground">Nullable</span>
      </Icon>
    </div>
  );
}

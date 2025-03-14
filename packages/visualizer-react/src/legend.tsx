import { cn } from "@repo/ui/utils/cn";
import {
  BadgeCheckIcon,
  CableIcon,
  DiamondIcon,
  KeyRoundIcon,
  LinkIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react";

export function DrizzleVisualizerLegend({
  className,
  theme = "dark",
}: {
  className?: string;
  theme?: "dark" | "light";
}) {
  return (
    <div
      data-app="drizzle-visualizer"
      data-theme-dv={theme}
      className={cn(
        "dv:flex dv:w-full dv:flex-wrap dv:items-center dv:justify-center dv:gap-2 dv:dark:bg-[#0f0f14] dv:px-2 dv:py-1",
        className,
      )}
    >
      <span className="dv:flex dv:items-center dv:gap-1">
        <KeyRoundIcon className="dv:text-green dv:size-4" />
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Primary key
        </span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <LinkIcon className="dv:text-green dv:size-4" />
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Foreign key
        </span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <ShieldCheckIcon className="dv:text-green dv:size-4" />
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Check
        </span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <LockIcon className="dv:text-green dv:size-4" />
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          RLS Policy
        </span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <CableIcon className="dv:text-green dv:size-4" />
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Drizzle relation
        </span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <BadgeCheckIcon className="dv:text-green dv:size-4" />
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Unique
        </span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <DiamondIcon className="dv:fill-secondary-foreground dv:text-secondary-foreground dv:size-4" />
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Non-null
        </span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <DiamondIcon className="dv:text-secondary-foreground dv:size-4" />
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Nullable
        </span>
      </span>
    </div>
  );
}

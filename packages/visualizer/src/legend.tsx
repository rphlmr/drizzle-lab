import {
  BadgeCheckIcon,
  CableIcon,
  DiamondIcon,
  KeyRoundIcon,
  LinkIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

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
      data-theme={theme}
      className={cn(
        "dv:flex dv:flex-wrap dv:justify-center dv:items-center dv:gap-2 dv:dark:bg-[#0f0f14] dv:px-2 dv:py-1 dv:w-full",
        className
      )}
    >
      <span className="dv:flex dv:items-center dv:gap-1">
        <KeyRoundIcon className="dv:size-4 dv:text-green" />
        <span className="dv:text-muted-foreground dv:text-xs dv:shrink-0">Primary key</span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <LinkIcon className="dv:size-4 dv:text-green" />
        <span className="dv:text-muted-foreground dv:text-xs dv:shrink-0">Foreign key</span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <ShieldCheckIcon className="dv:size-4 dv:text-green" />
        <span className="dv:text-muted-foreground dv:text-xs dv:shrink-0">Check</span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <LockIcon className="dv:size-4 dv:text-green" />
        <span className="dv:text-muted-foreground dv:text-xs dv:shrink-0">RLS Policy</span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <CableIcon className="dv:size-4 dv:text-green" />
        <span className="dv:text-muted-foreground dv:text-xs dv:shrink-0">Drizzle relation</span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <BadgeCheckIcon className="dv:size-4 dv:text-green" />
        <span className="dv:text-muted-foreground dv:text-xs dv:shrink-0">Unique</span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <DiamondIcon className="dv:fill-secondary-foreground dv:size-4 dv:text-secondary-foreground" />
        <span className="dv:text-muted-foreground dv:text-xs dv:shrink-0">Non-null</span>
      </span>
      <span className="dv:flex dv:items-center dv:gap-1">
        <DiamondIcon className="dv:size-4 dv:text-secondary-foreground" />
        <span className="dv:text-muted-foreground dv:text-xs dv:shrink-0">Nullable</span>
      </span>
    </div>
  );
}

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

export function DrizzleVisualizerLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "dv:flex dv:w-full dv:flex-wrap dv:items-center dv:justify-center dv:gap-2 dv:bg-[#0f0f14] dv:px-2 dv:py-1",
        className,
      )}
    >
      <KeyRoundIcon className="dv:text-green dv:size-4">
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Primary key
        </span>
      </KeyRoundIcon>
      <LinkIcon className="dv:text-green dv:size-4">
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Foreign key
        </span>
      </LinkIcon>
      <ShieldCheckIcon className="dv:text-green dv:size-4">
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Check
        </span>
      </ShieldCheckIcon>
      <LockIcon className="dv:text-green dv:size-4">
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          RLS Policy
        </span>
      </LockIcon>
      <CableIcon className="dv:text-green dv:size-4">
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Drizzle relation
        </span>
      </CableIcon>
      <BadgeCheckIcon className="dv:text-green dv:size-4">
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Unique
        </span>
      </BadgeCheckIcon>
      <DiamondIcon className="dv:fill-secondary-foreground dv:text-secondary-foreground dv:size-4">
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Non-null
        </span>
      </DiamondIcon>
      <DiamondIcon className="dv:text-secondary-foreground dv:size-4">
        <span className="dv:shrink-0 dv:text-xs dv:text-muted-foreground">
          Nullable
        </span>
      </DiamondIcon>
    </div>
  );
}

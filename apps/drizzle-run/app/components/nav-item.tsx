import { Button } from "@repo/ui/components/button";
import { Icon } from "@repo/ui/components/icon";
import type { IconName } from "@repo/ui/components/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

export function NavItem({
  tooltip,
  icon,
  onClick,
}: {
  tooltip: string;
  icon: IconName;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="dzl-rounded-lg"
          aria-label={tooltip}
          onClick={onClick}
        >
          <Icon name={icon} size="md" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={5}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

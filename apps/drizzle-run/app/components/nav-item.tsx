import { Button } from "./ui/button";
import { Icon, type IconName } from "./ui/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

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
        <Button variant="ghost" size="icon" className="rounded-lg" aria-label={tooltip} onClick={onClick}>
          <Icon name={icon} size="md" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={5}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Icon } from "@repo/ui/components/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

import { AnonymousCTA } from "~/components/anonymous-cta";
import type { Playground } from "~/database/types";

export function PlaygroundSelector({
  currentPlayground,
}: {
  currentPlayground: Playground;
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="dzl-w-[200px]">
            <span className="dzl-truncate">{currentPlayground.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="dzl-w-[200px]">
          <DropdownMenuItem>
            <Icon
              name="file-pen-line"
              size="md"
              className="dzl-mr-2 dzl-text-center"
            />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Icon
              name="git-fork"
              size="md"
              className="dzl-mr-2 dzl-text-center"
            />
            <span>Fork</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="focus:bg-destructive">
              <Icon
                name="trash-2"
                size="md"
                className="dzl-mr-2 dzl-text-center"
              />
              <span>Delete</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Icon name="triangle-alert" size="xl" className="dzl-text-red">
              Are you absolutely sure?
            </Icon>
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This playground will no longer be
            accessible by you or others you have shared it with.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild variant="destructive">
            <Button>I am sure, delete this playground</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PlaygroundActions() {
  return (
    <div className="dzl-flex dzl-items-center dzl-gap-1">
      <Popover>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Icon name="git-fork" size="md" />
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>Fork this playground</TooltipContent>
        </Tooltip>
        <PopoverContent className="dzl-w-fit">
          <AnonymousCTA />
        </PopoverContent>
      </Popover>
      <Popover>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Icon name="share" size="md" />
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>Share your playground</TooltipContent>
        </Tooltip>
        <PopoverContent className="dzl-w-fit">
          <AnonymousCTA />
        </PopoverContent>
      </Popover>
    </div>
  );
}

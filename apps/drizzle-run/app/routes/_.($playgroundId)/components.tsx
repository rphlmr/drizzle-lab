import { useState } from "react";

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
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Icon } from "@repo/ui/components/icon";
import { Input } from "@repo/ui/components/input";
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
import type { PlaygroundMetadata } from "~/modules/playground/machine.client";

export function PlaygroundSelector({
  metadata,
  onFork,
  onDiscardChanges,
  onEdit,
  onDelete,
  readOnly,
  hasPendingChanges,
}: {
  metadata: PlaygroundMetadata;
  onFork: () => void;
  onDiscardChanges: () => void;
  onEdit: (name: string) => void;
  onDelete: () => void;
  readOnly: boolean;
  hasPendingChanges: boolean;
}) {
  const [type, setType] = useState<"edit" | "delete" | "discard">("edit");
  const [name, setName] = useState(metadata.name);
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-fit max-w-[260px] gap-2 px-2">
            <Badge variant="outline">{metadata.dialect}</Badge>
            <span className="truncate">{metadata.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]">
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              disabled={readOnly}
              onSelect={() => {
                setType("edit");
              }}
            >
              <Icon
                name="file-pen-line"
                size="md"
                className="mr-2 text-center"
              />
              <span>Edit</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <DropdownMenuItem onSelect={onFork}>
            <Icon name="git-fork" size="md" className="mr-2 text-center" />
            <span>Fork</span>
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              disabled={readOnly || !hasPendingChanges}
              onSelect={() => {
                setType("discard");
              }}
            >
              <Icon
                name="list-restart"
                size="md"
                className="mr-2 text-center"
              />
              <span>Discard changes</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="focus:bg-destructive"
              disabled={readOnly}
              onSelect={() => {
                setType("delete");
              }}
            >
              <Icon name="trash-2" size="md" className="mr-2 text-center" />
              <span>Delete</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      {type === "edit" && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogDescription className="text-foreground">
              <Input
                placeholder="Playground name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                className="w-fit self-end"
                size="sm"
                type="submit"
                onClick={() => {
                  onEdit(name.trim() || metadata.name);
                }}
              >
                Update
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
      {type === "discard" && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Icon name="triangle-alert" size="xl" className="text-red">
                Are you absolutely sure?
              </Icon>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All changes will be reverted to the
              last saved server version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild variant="destructive">
              <Button onClick={onDiscardChanges}>
                I am sure, discard changes
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
      {type === "delete" && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Icon name="triangle-alert" size="xl" className="text-red">
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
              <Button onClick={onDelete}>
                I am sure, delete this playground
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}

export function PlaygroundActions() {
  return (
    <div className="flex items-center gap-1">
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
        <PopoverContent className="w-fit">
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
        <PopoverContent className="w-fit">
          <AnonymousCTA />
        </PopoverContent>
      </Popover>
    </div>
  );
}

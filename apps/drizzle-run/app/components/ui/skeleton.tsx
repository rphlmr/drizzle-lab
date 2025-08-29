import { cn } from "~/utils/cn";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-primary/10 rounded-md animate-pulse", className)} {...props} />;
}

export { Skeleton };

import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib/cn";
import { IconButton } from "./IconButton";

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function DialogContent({ variant = "center", title, className, children }) {
  const sheet = variant === "sheet";

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[rgb(25_7_24/0.6)]" />
      <DialogPrimitive.Content
        className={cn(
          "z-[60] border border-line bg-panel text-fg",
          sheet
            ? "fixed inset-x-0 bottom-0 rounded-t-panel p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            : "fixed left-1/2 top-1/2 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 rounded-card p-6",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <DialogPrimitive.Title className="min-w-0 truncate font-display text-h3 font-bold text-fg">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <IconButton aria-label="Close">
              <X aria-hidden="true" />
            </IconButton>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;

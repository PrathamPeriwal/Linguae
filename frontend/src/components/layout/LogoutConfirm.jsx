import { getErrorMessage } from "../../lib/errors";
import useLogout from "../../features/auth/hooks/useLogout";
import { Button } from "../ui/Button";
import { Dialog, DialogContent, DialogDescription } from "../ui/Dialog";

export function LogoutConfirm({ open, onOpenChange }) {
  const { logoutMutation, isPending, error } = useLogout();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent title="Log out?">
        <DialogDescription className="mt-2 text-body text-fg-muted">
          You will need to sign in again to chat.
        </DialogDescription>
        {error ? (
          <p role="alert" className="mt-3 text-small text-danger">
            {getErrorMessage(error)}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" loading={isPending} onClick={() => logoutMutation()}>
            Log out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

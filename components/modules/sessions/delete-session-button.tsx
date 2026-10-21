'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DeleteSessionButtonProps {
  /** Workspace terminology, lowercase singular. */
  sessionTerm: string;
  clientName: string;
  action: () => Promise<void>;
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Delete permanently
    </Button>
  );
}

export function DeleteSessionButton({
  sessionTerm,
  clientName,
  action,
}: DeleteSessionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}
      >
        <Trash2 className="size-4" />
        Delete {sessionTerm}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this {sessionTerm}?</DialogTitle>
          <DialogDescription>
            The notes and action items recorded against it go too. {clientName} keeps their
            record and every other {sessionTerm}. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <form action={action}>
            <ConfirmButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

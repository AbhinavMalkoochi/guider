'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export function InviteDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button>Invite teammate</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content aria-label="Invite teammate dialog">
          <Dialog.Title>Invite a teammate</Dialog.Title>
          <form onSubmit={(e) => { e.preventDefault(); setOpen(false); }}>
            <input type="email" placeholder="teammate@company.com" aria-label="Email" />
            <select aria-label="Role">
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit">Send invite</button>
            <button type="button" onClick={() => setOpen(false)}>Cancel</button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

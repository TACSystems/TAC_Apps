"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
  pendingLabel?: string;
};

/**
 * A submit button for a destructive server action — asks for confirmation
 * before the form actually submits, and shows a pending state while the
 * action runs. Must be rendered inside the <form> whose action it submits.
 */
export default function ConfirmSubmitButton({
  confirmMessage,
  children,
  pendingLabel,
  className,
  onClick,
  ...rest
}: Props) {
  const { pending } = useFormStatus();

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  }

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={handleClick}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
      {...rest}
    >
      {pending ? pendingLabel ?? "Deleting…" : children}
    </button>
  );
}

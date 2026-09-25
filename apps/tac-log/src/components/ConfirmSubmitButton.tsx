"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { useDialogs } from "@/components/Dialogs";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
  confirmLabel?: string;
  pendingLabel?: string;
};

export default function ConfirmSubmitButton({
  confirmMessage,
  confirmLabel,
  children,
  pendingLabel,
  className,
  onClick,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  const { confirm } = useDialogs();

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const button = e.currentTarget;
    const form = button.form;
    const label = confirmLabel ?? (typeof children === "string" ? children : undefined);
    if (!(await confirm({ message: confirmMessage, confirmLabel: label }))) return;
    onClick?.(e);
    form?.requestSubmit(button);
  }

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={handleClick}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
      {...rest}
    >
      {pending ? pendingLabel ?? "Working…" : children}
    </button>
  );
}

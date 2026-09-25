"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";
import Spinner from "@core/components/Spinner";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
};

export default function SubmitButton({ children, pendingLabel, className, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
      {...rest}
    >
      {pending ? (
        <>
          <Spinner /> {pendingLabel ?? "Saving…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

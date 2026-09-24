"use client";

import { useState, type InputHTMLAttributes } from "react";

export default function PasswordInput({ className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative flex w-full">
      <input {...rest} type={show ? "text" : "password"} className={`${className ?? ""} w-full pr-10`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide" : "Show"}
        title={show ? "Hide" : "Show"}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-neutral-500 hover:text-neutral-200"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}

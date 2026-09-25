"use client";

import { useEffect } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function messageFor(el: Field) {
  const v = el.validity;
  if (v.valueMissing) return el instanceof HTMLSelectElement ? "Choose one." : "Required.";
  if (v.rangeUnderflow && "min" in el) return `Must be at least ${el.min}.`;
  if (v.rangeOverflow && "max" in el) return `Must be ${el.max} or less.`;
  if (v.badInput || v.typeMismatch) return "That doesn't look right.";
  if (v.stepMismatch) return "Use a whole number.";
  if (v.tooShort && "minLength" in el) return `At least ${el.minLength} characters.`;
  return el.validationMessage;
}

function errorNode(el: Field) {
  const id = `${el.name || el.id || "field"}-error-${Array.from(el.form?.elements ?? []).indexOf(el)}`;
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("p");
    node.id = id;
    node.className = "field-error";
    node.setAttribute("role", "alert");
    el.insertAdjacentElement("afterend", node);
  }
  el.setAttribute("aria-describedby", id);
  return node;
}

export default function InlineValidation() {
  useEffect(() => {
    let focused = false;
    const onInvalid = (e: Event) => {
      const el = e.target as Field;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return;
      e.preventDefault();
      el.setAttribute("aria-invalid", "true");
      errorNode(el).textContent = messageFor(el);
      if (!focused) {
        focused = true;
        el.focus();
        setTimeout(() => (focused = false), 0);
      }
    };
    const onInput = (e: Event) => {
      const el = e.target as Field;
      if (!el?.getAttribute?.("aria-invalid")) return;
      if (el.checkValidity()) {
        el.removeAttribute("aria-invalid");
        const id = el.getAttribute("aria-describedby");
        if (id) document.getElementById(id)?.remove();
      }
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
    };
  }, []);
  return null;
}

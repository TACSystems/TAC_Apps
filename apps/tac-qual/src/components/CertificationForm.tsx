"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { saveCertificationAction } from "@/app/certifications/actions";

export type CourseOption = { id: string; code: string | null; name: string; expires_months: number | null };

export type CertificationDraft = {
  id?: string;
  name: string;
  code: string;
  description: string;
  certificate_title: string;
  certificate_body: string;
  cofIds: string[];
};

export default function CertificationForm({
  courses,
  initial,
}: {
  courses: CourseOption[];
  initial: CertificationDraft;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CertificationDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CertificationDraft>(key: K, value: CertificationDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggle = (id: string) =>
    setDraft((d) => ({
      ...d,
      cofIds: d.cofIds.includes(id) ? d.cofIds.filter((x) => x !== id) : [...d.cofIds, id],
    }));

  const move = (id: string, by: number) =>
    setDraft((d) => {
      const next = [...d.cofIds];
      const i = next.indexOf(id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= next.length) return d;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, cofIds: next };
    });

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveCertificationAction(draft);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.push(`/certifications/${result.id}`);
  }

  const chosen = draft.cofIds
    .map((id) => courses.find((c) => c.id === id))
    .filter((c): c is CourseOption => c !== undefined);

  return (
    <div className="space-y-6">
      <section className="card brk space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wide">The credential</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="field">
            <span className="req">Name</span>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Concealed Carry Certification"
            />
          </label>
          <label className="field">
            <span>Code</span>
            <input className="input" value={draft.code} onChange={(e) => set("code", e.target.value)} placeholder="CCW" />
          </label>
        </div>
        <label className="field">
          <span>Description</span>
          <textarea
            className="input"
            rows={2}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wide">Courses required</h2>
          <p className="text-sm text-neutral-500">
            A student holds this certification once they have a passing run on every course below, from any class on any
            date. The order here is the order they print in.
          </p>
        </div>

        {chosen.length > 0 && (
          <ol className="space-y-2">
            {chosen.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 border border-neutral-700 p-2">
                <span className="w-6 text-right text-neutral-500">{i + 1}</span>
                <span className="flex-1">
                  {c.code ? <span className="text-neutral-500">{c.code} · </span> : null}
                  {c.name}
                  {c.expires_months ? (
                    <span className="text-neutral-500"> · expires after {c.expires_months} months</span>
                  ) : null}
                </span>
                <button type="button" className="btn btn-sm" onClick={() => move(c.id, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => move(c.id, 1)}
                  disabled={i === chosen.length - 1}
                >
                  ↓
                </button>
                <button type="button" className="btn btn-sm" onClick={() => toggle(c.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className="grid gap-2 md:grid-cols-2">
          {courses
            .filter((c) => !draft.cofIds.includes(c.id))
            .map((c) => (
              <button
                key={c.id}
                type="button"
                className="btn justify-start text-left"
                onClick={() => toggle(c.id)}
              >
                + {c.code ? `${c.code} · ` : ""}
                {c.name}
              </button>
            ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wide">Certificate wording</h2>
          <p className="text-sm text-neutral-500">
            Leave blank to use the wording in Settings → Certificates. Fill either in to override it for this
            certification only.
          </p>
        </div>
        <label className="field">
          <span>Title</span>
          <input
            className="input"
            value={draft.certificate_title}
            onChange={(e) => set("certificate_title", e.target.value)}
            placeholder="Certificate of Completion"
          />
        </label>
        <label className="field">
          <span>Body</span>
          <input
            className="input"
            value={draft.certificate_body}
            onChange={(e) => set("certificate_body", e.target.value)}
            placeholder="has satisfactorily completed the requirements for"
          />
        </label>
      </section>

      {error ? (
        <p role="alert" className="border border-red-700 bg-red-950/40 px-3 py-2 text-red-300">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Certification"}
        </button>
        <Link className="btn" href={initial.id ? `/certifications/${initial.id}` : "/certifications"}>
          Cancel
        </Link>
      </div>
    </div>
  );
}

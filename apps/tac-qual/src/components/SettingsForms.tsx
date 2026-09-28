import SubmitButton from "@core/components/SubmitButton";
import { saveSettingsForm } from "@/app/settings/actions";
import { DATE_FORMATS, TEXT_SIZES, type AppSettings } from "@/lib/settings-shared";

const input = "input";

function Save({ saved }: { saved?: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <SubmitButton pendingLabel="Saving…" className="btn btn-primary w-fit">
        Save
      </SubmitButton>
      {saved && <span className="text-sm text-green-400">Saved.</span>}
    </div>
  );
}

export function ClassDefaultsForm({ s, saved, returnTo }: { s: AppSettings; saved?: boolean; returnTo: string }) {
  return (
    <form action={saveSettingsForm} className="flex flex-col">
      <input type="hidden" name="__return" value={returnTo} />
      <input type="hidden" name="__section" value="classes" />
      <p className="mb-3 text-sm text-neutral-400">
        Pre-filled when you create a class or assign relays. You can still change them each time.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Instructor Name
          <input name="instructorName" defaultValue={s.instructorName} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Class Location
          <input name="defaultClassLocation" defaultValue={s.defaultClassLocation} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Relay Size
          <input type="number" min={1} max={40} name="defaultRelaySize" defaultValue={s.defaultRelaySize} className={input} />
        </label>
      </div>

      <Save saved={saved} />
    </form>
  );
}

export function DisplayForm({ s, saved, returnTo }: { s: AppSettings; saved?: boolean; returnTo: string }) {
  return (
    <form action={saveSettingsForm} className="flex flex-col">
      <input type="hidden" name="__return" value={returnTo} />
      <input type="hidden" name="__section" value="display" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Date Format
          <select name="dateFormat" defaultValue={s.dateFormat} className={input}>
            {Object.entries(DATE_FORMATS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Text Size
          <select name="textSize" defaultValue={s.textSize} className={input}>
            {Object.entries(TEXT_SIZES).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Theme
          <select name="theme" defaultValue={s.theme} className={input}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Text size and theme apply everywhere. Printed sheets stay black on white whatever you pick here.
      </p>
      <Save saved={saved} />
    </form>
  );
}

export function CertificateForm({ s, saved, returnTo }: { s: AppSettings; saved?: boolean; returnTo: string }) {
  const c = s.certificate;
  return (
    <form action={saveSettingsForm} className="flex flex-col">
      <input type="hidden" name="__return" value={returnTo} />
      <input type="hidden" name="__section" value="certificates" />
      <input type="hidden" name="__certificate" value="1" />
      <p className="mb-3 text-sm text-neutral-400">
        The layout is fixed so it prints reliably. A certification can override the title and wording for itself.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          School or Program Name
          <input name="cert_schoolName" defaultValue={c.schoolName} className={input} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input name="cert_title" defaultValue={c.title} className={input} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Wording
          <input name="cert_body" defaultValue={c.body} className={input} maxLength={400} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Signature Line Label
          <input name="cert_signatureLabel" defaultValue={c.signatureLabel} className={input} maxLength={80} />
        </label>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="cert_showExpiry" defaultChecked={c.showExpiry} />
          Print an expiry date
          <span className="text-neutral-500">
            — off by default: a date on paper cannot answer a requalification that happened since.
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="cert_showCourses" defaultChecked={c.showCourses} />
          List the courses on the certificate itself
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="cert_scorePage" defaultChecked={c.scorePage} />
          Print a second page with courses and scores
        </label>
      </div>

      <Save saved={saved} />
    </form>
  );
}

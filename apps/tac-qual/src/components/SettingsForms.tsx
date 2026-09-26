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

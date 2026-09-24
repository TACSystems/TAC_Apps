import SubmitButton from "@/components/SubmitButton";
import HelpTip from "@/components/HelpTip";
import { saveSettingsForm } from "@/app/settings/actions";
import { DATE_FORMATS, FIREARM_LABEL_MODES, TEXT_SIZES, type AppSettings } from "@/lib/settings-shared";

const input = "border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm normal-case";

function Save({ saved }: { saved?: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <SubmitButton pendingLabel="Saving…" className="w-fit bg-brand-olive px-5 py-2 text-sm font-medium hover:bg-brand-olive-light">
        Save
      </SubmitButton>
      {saved && <span className="text-sm text-green-400">Saved.</span>}
    </div>
  );
}

export function RangeDefaultsForm({ s, saved, returnTo }: { s: AppSettings; saved?: boolean; returnTo: string }) {
  return (
    <form action={saveSettingsForm} className="flex flex-col">
      <input type="hidden" name="__return" value={returnTo} />
      <input type="hidden" name="__section" value="range" />
      <input type="hidden" name="__cb" value="graderDateFromSession" />
      <p className="mb-3 text-sm text-neutral-400">Pre-filled on the Log a Range Session form. You can still change them each time.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Shooter Name
          <input name="defaultShooterName" defaultValue={s.defaultShooterName} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Grader Name
          <input name="defaultGraderName" defaultValue={s.defaultGraderName} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Range Location
          <input name="defaultRangeLocation" defaultValue={s.defaultRangeLocation} className={input} />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm normal-case">
        <input type="checkbox" name="graderDateFromSession" defaultChecked={s.graderDateFromSession} />
        Grader Date fills in with the session date (you can still change it)
      </label>
      <Save saved={saved} />
    </form>
  );
}

export function MaintenanceDefaultsForm({ s, saved, returnTo }: { s: AppSettings; saved?: boolean; returnTo: string }) {
  return (
    <form action={saveSettingsForm} className="flex flex-col">
      <input type="hidden" name="__return" value={returnTo} />
      <input type="hidden" name="__section" value="maintenance" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          New firearms: clean every (rounds)
          <input
            type="number"
            min={1}
            name="defaultCleanIntervalRounds"
            defaultValue={s.defaultCleanIntervalRounds ?? ""}
            placeholder="None"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          New firearms: clean every (days)
          <input
            type="number"
            min={1}
            name="defaultCleanIntervalDays"
            defaultValue={s.defaultCleanIntervalDays ?? ""}
            placeholder="None"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>
            &quot;Due soon&quot; at (% of interval) <HelpTip text="A firearm shows Due Soon once it reaches this share of its cleaning interval, e.g. 80% means 400 of 500 rounds." />
          </span>
          <input
            type="number"
            min={1}
            max={99}
            name="dueSoonPercent"
            defaultValue={s.dueSoonPercent}
            className={input}
          />
        </label>
      </div>
      <Save saved={saved} />
    </form>
  );
}

export function AmmoDefaultsForm({ s, saved, returnTo, manufacturers, ammoTypes }: { s: AppSettings; saved?: boolean; returnTo: string; manufacturers: string[]; ammoTypes: string[] }) {
  return (
    <form action={saveSettingsForm} className="flex flex-col">
      <input type="hidden" name="__return" value={returnTo} />
      <input type="hidden" name="__section" value="ammo" />
      <input type="hidden" name="__cb" value="deductManualRoundsByDefault" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm normal-case">
          <input
            type="checkbox"
            name="deductManualRoundsByDefault"
            defaultChecked={s.deductManualRoundsByDefault}
          />
          Update Rounds Fired deducts from ammo on hand by default
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>
            Flag ammo as low below (% of goal) <HelpTip text="A caliber shows LOW when what you have on hand drops below this percent of its goal." />
          </span>
          <input
            type="number"
            min={1}
            max={100}
            name="lowAmmoPercent"
            defaultValue={s.lowAmmoPercent}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Default Manufacturer (Log Ammo Purchase)
          <input name="defaultAmmoManufacturer" list="settings-ammo-mfr" defaultValue={s.defaultAmmoManufacturer} placeholder="None" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Default Ammo Type (Log Ammo Purchase)
          <input name="defaultAmmoType" list="settings-ammo-type" defaultValue={s.defaultAmmoType} placeholder="None" className={input} />
        </label>
        <datalist id="settings-ammo-mfr">
          {manufacturers.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
        <datalist id="settings-ammo-type">
          {ammoTypes.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </div>
      <Save saved={saved} />
    </form>
  );
}

export function DocumentWarningsForm({ s, saved, returnTo }: { s: AppSettings; saved?: boolean; returnTo: string }) {
  return (
    <form action={saveSettingsForm} className="flex flex-col">
      <input type="hidden" name="__return" value={returnTo} />
      <input type="hidden" name="__section" value="documents" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>
            Warn about expiring documents (days before) <HelpTip text="Documents show in the Heads Up bar and on the dashboard this many days before they expire." />
          </span>
          <input type="number" min={1} max={365} name="docWarnDays" defaultValue={s.docWarnDays} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Show as urgent (days before)
          <input type="number" min={0} max={365} name="docUrgentDays" defaultValue={s.docUrgentDays} className={input} />
        </label>
      </div>
      <Save saved={saved} />
    </form>
  );
}

export function HeadsUpForm({ s, saved, returnTo }: { s: AppSettings; saved?: boolean; returnTo: string }) {
  return (
    <form action={saveSettingsForm} className="flex flex-col">
      <input type="hidden" name="__return" value={returnTo} />
      <input type="hidden" name="__section" value="headsup" />
      <input type="hidden" name="__cb" value="launchReminders" />
      <label className="mb-3 flex items-center gap-2 text-sm normal-case">
        <input type="checkbox" name="launchReminders" defaultChecked={s.launchReminders} />
        Show a Heads Up bar when TAC-LOG opens or unlocks (cleaning due, low ammo, expiring documents, parts due)
      </label>
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
          Show Firearms As
          <select name="firearmLabel" defaultValue={s.firearmLabel} className={input}>
            {Object.entries(FIREARM_LABEL_MODES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date Format
          <select name="dateFormat" defaultValue={s.dateFormat} className={input}>
            {Object.entries(DATE_FORMATS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Currency Symbol
          <input name="currencySymbol" defaultValue={s.currencySymbol} maxLength={4} className={input} />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Theme
          <select name="theme" defaultValue={s.theme} className={input}>
            <option value="dark">Dark (olive &amp; amber)</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Text Size
          <select name="textSize" defaultValue={s.textSize} className={input}>
            {Object.entries(TEXT_SIZES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        The Inventory Report for insurance always lists make, model, and serial number, whatever you pick here.
      </p>
      <Save saved={saved} />
    </form>
  );
}

"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useDialogs } from "@core/components/Dialogs";
import {
  computePhaseRounds,
  type CourseColumn,
  } from "@core/lib/cof-shared";
import {
  isCombinedArms,
  joinRoundsParts,
  matchWeaponOption,
  roundsPartsFor,
  splitWeaponCell,
  weaponOptions,
} from "@core/lib/course-categories";
import { addLink, cellInput, input, moved, smallBtn, toNum, uid, type BPhase, type BRow } from "./model";

export default function PhasesEditor({
  phases,
  setPhases,
  columns,
  positionOptions,
  categories = [],
}: {
  phases: BPhase[];
  setPhases: Dispatch<SetStateAction<BPhase[]>>;
  columns: CourseColumn[];
  positionOptions: string[];
  categories?: string[];
}) {
  const { confirm } = useDialogs();
  const weaponChoices = weaponOptions(categories);
  const combinedArms = isCombinedArms(categories);
  const [offer, setOffer] = useState<{ from: string; to: string; count: number } | null>(null);
  function nextStringNumber() {
    let max = 0;
    for (const p of phases) for (const s of p.strings) if (s.string_number != null) max = Math.max(max, s.string_number);
    return max + 1;
  }

  function updatePhase(pid: string, patch: Partial<BPhase>) {
    setPhases((ps) => ps.map((p) => (p.uid === pid ? { ...p, ...patch } : p)));
  }

  function updateRows(pid: string, fn: (rows: BRow[]) => BRow[]) {
    setPhases((ps) => ps.map((p) => (p.uid === pid ? { ...p, strings: fn(p.strings) } : p)));
  }

  function updateRow(pid: string, rid: string, patch: Partial<BRow>) {
    updateRows(pid, (rows) => rows.map((r) => (r.uid === rid ? { ...r, ...patch } : r)));
  }

  function setCell(pid: string, rid: string, key: string, value: string) {
    setCells(pid, rid, { [key]: value });
  }

  function setCells(pid: string, rid: string, patch: Record<string, string>) {
    updateRows(pid, (rows) =>
      rows.map((r) => (r.uid === rid ? { ...r, values: { ...r.values, ...patch } } : r))
    );
  }

  /**
   * The weapon cell and the rounds cell are read in the same order, so the
   * rounds boxes have to follow the weapon the moment it changes — otherwise
   * "4 / 2" survives a switch to one weapon and reads as six rounds.
   */
  function setWeapon(pid: string, rid: string, row: BRow, value: string) {
    const was = (row.values.weapon ?? "").trim();
    setCells(pid, rid, { weapon: value, rounds: weaponRounds(row.values.rounds, value) });

    // A course spells a weapon the same way all the way down, so fixing one
    // off-list cell almost always means fixing every other one like it. The
    // offer is made, never taken on its own — decision 12 stands.
    const fixable =
      was && value && !matchWeaponOption(was, weaponChoices) && weaponChoices.includes(value)
        ? countLike(was, rid)
        : 0;
    setOffer(fixable > 0 ? { from: was, to: value, count: fixable } : null);
  }

  function weaponRounds(rounds: string | undefined, weapon: string) {
    return joinRoundsParts(roundsPartsFor(rounds, Math.max(1, splitWeaponCell(weapon).length)));
  }

  function sameSpelling(a: string, b: string) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  function countLike(spelling: string, exceptRid: string) {
    let n = 0;
    for (const p of phases) {
      for (const r of p.strings) {
        if (r.uid === exceptRid || r.row_type !== "string") continue;
        if (r.values.weapon && sameSpelling(r.values.weapon, spelling)) n++;
      }
    }
    return n;
  }

  function applyOffer() {
    if (!offer) return;
    const { from, to } = offer;
    setPhases((ps) =>
      ps.map((p) => ({
        ...p,
        strings: p.strings.map((r) =>
          r.row_type === "string" && r.values.weapon && sameSpelling(r.values.weapon, from)
            ? { ...r, values: { ...r.values, weapon: to, rounds: weaponRounds(r.values.rounds, to) } }
            : r
        ),
      }))
    );
    setOffer(null);
  }

  function addString(pid: string) {
    const n = nextStringNumber();
    updateRows(pid, (rows) => {
      const last = [...rows].reverse().find((r) => r.row_type === "string");
      const carry: Record<string, string> = {};
      if (last?.values.distance) carry.distance = last.values.distance;
      return [...rows, { uid: uid(), row_type: "string", string_number: n, option_label: null, values: carry }];
    });
  }

  function addOption(pid: string, row: BRow) {
    updateRows(pid, (rows) => {
      const idx = rows.findIndex((r) => r.uid === row.uid);
      const siblings = rows.filter((r) => r.row_type === "string" && r.string_number === row.string_number);
      const letter = (i: number) => `OPTION ${String.fromCharCode(65 + i)}`;
      const next = rows.map((r) =>
        r.uid === row.uid && !r.option_label ? { ...r, option_label: letter(0) } : r
      );
      let insertAt = idx;
      for (let i = idx; i < next.length; i++) {
        if (next[i].row_type === "string" && next[i].string_number === row.string_number) insertAt = i;
      }
      next.splice(insertAt + 1, 0, {
        uid: uid(),
        row_type: "string",
        string_number: row.string_number,
        option_label: letter(Math.max(siblings.length, 1)),
        values: { ...row.values },
      });
      return next;
    });
  }

  function renumber() {
    let n = 0;
    setPhases((ps) =>
      ps.map((p) => {
        let prevOriginal: number | null | undefined = undefined;
        return {
          ...p,
          strings: p.strings.map((s) => {
            if (s.row_type !== "string") return s;
            const sameGroup = s.option_label && prevOriginal !== undefined && s.string_number === prevOriginal;
            prevOriginal = s.string_number;
            if (!sameGroup) n += 1;
            return { ...s, string_number: n };
          }),
        };
      })
    );
  }

  return (
      <section className="flex flex-col gap-4">
        {offer ? (
          <div className="flex flex-wrap items-center gap-3 border border-brand-amber/60 bg-neutral-900 px-3 py-2 text-sm">
            <span>
              {offer.count} other {offer.count === 1 ? "string says" : "strings say"}{" "}
              <b className="text-brand-amber">{offer.from}</b>. Change {offer.count === 1 ? "it" : "them"} to{" "}
              <b>{offer.to}</b> as well?
            </span>
            <span className="flex-1" />
            <button type="button" className={smallBtn} onClick={applyOffer}>
              Fix {offer.count === 1 ? "it" : "all " + offer.count}
            </button>
            <button type="button" className={smallBtn} onClick={() => setOffer(null)}>
              Leave them
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-neutral-200">4 · Phases &amp; Strings</h2>
          <button type="button" className={smallBtn} onClick={renumber}>
            Renumber strings 1…n
          </button>
        </div>

        {phases.map((phase, pi) => {
          const auto = computePhaseRounds({ strings: phase.strings });
          return (
            <div key={phase.uid} className="flex flex-col gap-3 border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
                  Phase {pi + 1} Title
                  <input value={phase.title} onChange={(e) => updatePhase(phase.uid, { title: e.target.value })} className={input} />
                </label>
                <label className="flex w-32 flex-col gap-1 text-sm">
                  Rounds
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={phase.total}
                    onChange={(e) => updatePhase(phase.uid, { total: e.target.value })}
                    placeholder={`Auto: ${auto}`}
                    className={input}
                  />
                </label>
                <div className="flex gap-1 pb-1">
                  <button type="button" className={smallBtn} disabled={pi === 0} onClick={() => setPhases((ps) => moved(ps, pi, -1))}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className={smallBtn}
                    disabled={pi === phases.length - 1}
                    onClick={() => setPhases((ps) => moved(ps, pi, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={smallBtn}
                    onClick={() =>
                      setPhases((ps) => {
                        const copy: BPhase = {
                          ...phase,
                          uid: uid(),
                          title: `${phase.title} (copy)`,
                          strings: phase.strings.map((s) => ({ ...s, values: { ...s.values }, uid: uid() })),
                        };
                        const next = [...ps];
                        next.splice(pi + 1, 0, copy);
                        return next;
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className={`${smallBtn} text-red-300`}
                    disabled={phases.length === 1}
                    onClick={async () => {
                      if (await confirm({ message: `Remove "${phase.title}" and its ${phase.strings.length} row(s)?`, confirmLabel: "Remove" })) {
                        setPhases((ps) => ps.filter((p) => p.uid !== phase.uid));
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <textarea
                value={phase.notes}
                onChange={(e) => updatePhase(phase.uid, { notes: e.target.value })}
                rows={1}
                placeholder="Phase notes (optional) — setup, target placement, reminders"
                className={input}
              />

              <div className="table-wrap">
                <table className="w-full table-auto text-left text-sm">
                  <thead>
                    <tr>
                      <th className="w-20 px-2 py-2">#</th>
                      <th className="w-28 px-2 py-2">Option</th>
                      {columns.map((c) => (
                        <th key={c.key} className={`px-2 py-2 ${c.key === "action" ? "w-[32%]" : ""}`}>
                          {c.label}
                          {c.key === "rounds" && combinedArms && (
                            <span className="ml-1 whitespace-nowrap font-normal normal-case text-neutral-500">· in weapon order</span>
                          )}
                        </th>
                      ))}
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {phase.strings.map((row, ri) => (
                      <tr key={row.uid} className="border-t border-neutral-800 align-top">
                        {row.row_type === "note" ? (
                          <td colSpan={columns.length + 2} className="px-2 py-1.5">
                            <input
                              value={row.values.action ?? ""}
                              onChange={(e) => setCell(phase.uid, row.uid, "action", e.target.value)}
                              placeholder="Instruction row, e.g. * TRANSITION TO 7 YARD LINE *"
                              className={`${cellInput} text-center text-brand-amber`}
                            />
                          </td>
                        ) : (
                          <>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                step="any"
                                value={row.string_number ?? ""}
                                onChange={(e) => updateRow(phase.uid, row.uid, { string_number: toNum(e.target.value) })}
                                className={`${cellInput} !min-w-[3.5rem] w-14`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={row.option_label ?? ""}
                                onChange={(e) =>
                                  updateRow(phase.uid, row.uid, { option_label: e.target.value || null })
                                }
                                placeholder="—"
                                className={`${cellInput} !min-w-[5.5rem] w-24`}
                              />
                            </td>
                            {columns.map((c) => {
                              if (c.key === "action") {
                                return (
                                  <td key={c.key} className="px-2 py-1.5">
                                    <textarea
                                      value={row.values[c.key] ?? ""}
                                      onChange={(e) => setCell(phase.uid, row.uid, c.key, e.target.value)}
                                      rows={1}
                                      className={`${cellInput} !min-w-[12rem] resize-none [field-sizing:content]`}
                                    />
                                  </td>
                                );
                              }
                              if (c.key === "weapon" && weaponChoices.length) {
                                const raw = row.values.weapon ?? "";
                                const matched = matchWeaponOption(raw, weaponChoices);
                                const cur = matched ?? raw;
                                const offList = Boolean(raw) && !matched;
                                return (
                                  <td key={c.key} className="px-2 py-1.5">
                                    <select
                                      value={cur}
                                      onChange={(e) => setWeapon(phase.uid, row.uid, row, e.target.value)}
                                      className={`${cellInput} !min-w-[11rem] ${offList ? "text-brand-amber" : ""}`}
                                    >
                                      <option value="">—</option>
                                      {weaponChoices.map((v) => (
                                        <option key={v} value={v}>
                                          {v}
                                        </option>
                                      ))}
                                      {offList && <option value={cur}>{cur} — off-list</option>}
                                    </select>
                                  </td>
                                );
                              }
                              if (c.key === "rounds") {
                                const weapons = splitWeaponCell(row.values.weapon);
                                const parts = roundsPartsFor(row.values.rounds, weapons.length || 1);
                                if (parts.length < 2) {
                                  return (
                                    <td key={c.key} className="px-2 py-1.5">
                                      <input
                                        value={row.values.rounds ?? ""}
                                        onChange={(e) => setCell(phase.uid, row.uid, "rounds", e.target.value)}
                                        autoComplete="off"
                                        className={cellInput}
                                      />
                                    </td>
                                  );
                                }
                                return (
                                  <td key={c.key} className="px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      {parts.map((v, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                          {i > 0 && <span className="text-neutral-500">/</span>}
                                          <input
                                            value={v}
                                            inputMode="numeric"
                                            title={weapons[i]}
                                            placeholder={weapons[i]}
                                            onChange={(e) => {
                                              const next = [...parts];
                                              next[i] = e.target.value;
                                              setCell(phase.uid, row.uid, "rounds", joinRoundsParts(next));
                                            }}
                                            autoComplete="off"
                                            className={`${cellInput} !min-w-[3rem] w-14`}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                );
                              }
                              return (
                                <td key={c.key} className="px-2 py-1.5">
                                  <input
                                    value={row.values[c.key] ?? ""}
                                    onChange={(e) => setCell(phase.uid, row.uid, c.key, e.target.value)}
                                    list={c.key === "position" && positionOptions.length ? "builder-positions" : undefined}
                                    autoComplete="off"
                                    className={cellInput}
                                  />
                                </td>
                              );
                            })}
                          </>
                        )}
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1 whitespace-nowrap">
                            <button
                              type="button"
                              className={smallBtn}
                              disabled={ri === 0}
                              title="Move up"
                              onClick={() => updateRows(phase.uid, (rows) => moved(rows, ri, -1))}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={smallBtn}
                              disabled={ri === phase.strings.length - 1}
                              title="Move down"
                              onClick={() => updateRows(phase.uid, (rows) => moved(rows, ri, 1))}
                            >
                              ↓
                            </button>
                            {row.row_type === "string" && (
                              <button
                                type="button"
                                className={smallBtn}
                                title="Add an alternate option for this string"
                                onClick={() => addOption(phase.uid, row)}
                              >
                                +Opt
                              </button>
                            )}
                            <button
                              type="button"
                              className={smallBtn}
                              title="Duplicate row"
                              onClick={() =>
                                updateRows(phase.uid, (rows) => {
                                  const next = [...rows];
                                  next.splice(ri + 1, 0, {
                                    ...row,
                                    uid: uid(),
                                    values: { ...row.values },
                                    string_number: row.row_type === "string" ? nextStringNumber() : null,
                                    option_label: null,
                                  });
                                  return next;
                                })
                              }
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              className={`${smallBtn} text-red-300`}
                              title="Remove row"
                              onClick={() => updateRows(phase.uid, (rows) => rows.filter((r) => r.uid !== row.uid))}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4">
                <button type="button" className={addLink} onClick={() => addString(phase.uid)}>
                  + String
                </button>
                <button
                  type="button"
                  className={addLink}
                  onClick={() =>
                    updateRows(phase.uid, (rows) => [
                      ...rows,
                      { uid: uid(), row_type: "note", string_number: null, option_label: null, values: {} },
                    ])
                  }
                >
                  + Instruction row
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className={`${addLink} w-fit`}
          onClick={() =>
            setPhases((ps) => [
              ...ps,
              {
                uid: uid(),
                title: `Phase ${ps.length + 1}`,
                notes: "",
                total: "",
                strings: [
                  { uid: uid(), row_type: "string", string_number: nextStringNumber(), option_label: null, values: {} },
                ],
              },
            ])
          }
        >
          + Add phase
        </button>
      </section>
  );
}

import type Database from "better-sqlite3-multiple-ciphers";

export type Hit = { kind: string; label: string; sub: string | null; href: string };

const KINDS = ["Students", "Classes", "Courses", "Targets"] as const;

export type SearchResults = { query: string; groups: { kind: string; hits: Hit[] }[]; total: number };

export function search(db: Database.Database, raw: string, perKind = 5): SearchResults {
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return { query: q, groups: [], total: 0 };
  const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
  const digits = q.replace(/\D/g, "");
  const classNumber = digits ? Number(digits) : null;

  const students = db
    .prepare(
      `select id, last_name, first_name, email, status from students
        where last_name like ? escape '\\' or first_name like ? escape '\\'
           or (last_name || ', ' || first_name) like ? escape '\\'
           or email like ? escape '\\'
        order by last_name, first_name limit ?`
    )
    .all(like, like, like, like, perKind) as {
    id: string;
    last_name: string;
    first_name: string;
    email: string | null;
    status: string;
  }[];

  const classes = db
    .prepare(
      `select id, number, title, date, location from classes
        where title like ? escape '\\' or location like ? escape '\\' or (? is not null and number = ?)
        order by date desc limit ?`
    )
    .all(like, like, classNumber, classNumber, perKind) as {
    id: string;
    number: number;
    title: string;
    date: string;
    location: string | null;
  }[];

  const courses = db
    .prepare(
      `select id, code, name from courses_of_fire
        where code like ? escape '\\' or name like ? escape '\\'
        order by name limit ?`
    )
    .all(like, like, perKind) as { id: string; code: string; name: string }[];

  const targets = db
    .prepare(
      `select id, name, description from target_types
        where name like ? escape '\\' or description like ? escape '\\'
        order by name limit ?`
    )
    .all(like, like, perKind) as { id: string; name: string; description: string | null }[];

  const groups = [
    {
      kind: "Students",
      hits: students.map((s) => ({
        kind: "Students",
        label: `${s.last_name}, ${s.first_name}`,
        sub: s.status === "active" ? s.email : `${s.status}${s.email ? ` · ${s.email}` : ""}`,
        href: `/students/${s.id}`,
      })),
    },
    {
      kind: "Classes",
      hits: classes.map((c) => ({
        kind: "Classes",
        label: `#${String(c.number).padStart(4, "0")} · ${c.title}`,
        sub: [c.date, c.location].filter(Boolean).join(" · ") || null,
        href: `/classes/${c.id}`,
      })),
    },
    {
      kind: "Courses",
      hits: courses.map((c) => ({ kind: "Courses", label: c.name, sub: c.code, href: `/courses/${c.id}` })),
    },
    {
      kind: "Targets",
      hits: targets.map((t) => ({
        kind: "Targets",
        label: t.name,
        sub: t.description,
        href: `/targets#target-${t.id}`,
      })),
    },
  ].filter((g) => g.hits.length > 0);

  groups.sort((a, b) => KINDS.indexOf(a.kind as never) - KINDS.indexOf(b.kind as never));
  return { query: q, groups, total: groups.reduce((n, g) => n + g.hits.length, 0) };
}

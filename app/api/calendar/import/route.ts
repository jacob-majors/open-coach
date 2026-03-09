import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

function unfoldLines(raw: string) {
  // iCal line folding: CRLF + whitespace = continuation
  return raw.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseIcalDate(val: string): { dateStr: string; timeStr: string | null } {
  // Formats: 20240315T140000Z, 20240315T140000, 20240315
  const clean = val.replace(/TZID=[^:]+:/, ""); // strip TZID param
  if (clean.length === 8) {
    // All-day: YYYYMMDD
    return {
      dateStr: `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`,
      timeStr: null,
    };
  }
  const year = clean.slice(0, 4);
  const month = clean.slice(4, 6);
  const day = clean.slice(6, 8);
  const hour = clean.slice(9, 11);
  const min = clean.slice(11, 13);
  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hour}:${min}`,
  };
}

function parseDuration(dtstart: string, dtend: string | null): number {
  if (!dtend) return 90;
  try {
    const start = new Date(dtstart.length === 8
      ? `${dtstart.slice(0, 4)}-${dtstart.slice(4, 6)}-${dtstart.slice(6, 8)}`
      : dtstart.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, "$1-$2-$3T$4:$5:$6Z"));
    const end = new Date(dtend.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, "$1-$2-$3T$4:$5:$6Z"));
    return Math.round((end.getTime() - start.getTime()) / 60000) || 90;
  } catch {
    return 90;
  }
}

function parseVEvents(ical: string) {
  const unfolded = unfoldLines(ical);
  const events: Array<{
    uid: string;
    summary: string;
    description: string;
    location: string;
    dtstart: string;
    dtend: string | null;
  }> = [];

  const blocks = unfolded.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key: string) => {
      const re = new RegExp(`^${key}[;:][^\n]*`, "m");
      const m = block.match(re);
      if (!m) return "";
      return m[0].replace(/^[^:]+:/, "").trim();
    };

    const uid = get("UID") || `import-${i}`;
    const summary = get("SUMMARY") || "Practice";
    const description = get("DESCRIPTION").replace(/\\n/g, " ").replace(/\\,/g, ",");
    const location = get("LOCATION").replace(/\\,/g, ",");
    const dtstart = get("DTSTART");
    const dtend = get("DTEND") || null;

    if (!dtstart) continue;
    events.push({ uid, summary, description, location, dtstart, dtend });
  }
  return events;
}

async function requireCoach(session: { userId: number }) {
  const db = getDb();
  const me = await db.execute({ sql: `SELECT role, is_admin FROM users WHERE id = ?`, args: [session.userId] });
  const row = me.rows[0];
  return row && (row.role === "coach" || row.role === "admin" || row.is_admin);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { url, compTeam, limit } = await req.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Fetch the iCal file
  let icalText: string;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "OpenCoach/1.0" } });
    if (!res.ok) return NextResponse.json({ error: `Failed to fetch iCal: ${res.status}` }, { status: 400 });
    icalText = await res.text();
  } catch (e) {
    return NextResponse.json({ error: "Could not fetch iCal URL" }, { status: 400 });
  }

  const events = parseVEvents(icalText);
  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const todayStr = now.toISOString().slice(0, 10);
  const endStr = oneYearLater.toISOString().slice(0, 10);

  const db = getDb();
  let imported = 0;
  let skipped = 0;

  // Fetch all existing UIDs at once to avoid per-event DB queries (prevents timeout)
  const existingNotesRows = await db.execute({
    sql: `SELECT notes FROM practices WHERE notes LIKE '%[uid:%'`,
    args: [],
  });
  const existingUids = new Set<string>();
  for (const row of existingNotesRows.rows) {
    const m = (row.notes as string)?.match(/\[uid:([^\]]+)\]/);
    if (m) existingUids.add(m[1]);
  }

  for (const ev of events) {
    if (limit != null && imported >= limit) { skipped++; continue; }
    const { dateStr, timeStr } = parseIcalDate(ev.dtstart);
    if (dateStr < todayStr || dateStr > endStr) { skipped++; continue; }

    // Avoid duplicate imports by checking uid
    if (existingUids.has(ev.uid)) { skipped++; continue; }

    const durationMinutes = parseDuration(ev.dtstart, ev.dtend);
    const notes = [ev.description, ev.uid ? `[uid:${ev.uid}]` : null].filter(Boolean).join("\n");

    await db.execute({
      sql: `INSERT INTO practices (title, comp_team, practice_date, start_time, duration_minutes, location, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        ev.summary,
        compTeam || null,
        dateStr,
        timeStr,
        durationMinutes,
        ev.location || null,
        notes || null,
        session.userId,
      ],
    });
    imported++;
  }

  return NextResponse.json({ success: true, imported, skipped, total: events.length });
}

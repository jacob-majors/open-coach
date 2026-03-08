import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function escapeIcal(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcalDate(dateStr: string, timeStr: string | null): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM or null
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(h, m, 0, 0);
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  // All-day
  return dateStr.replace(/-/g, "");
}

function toIcalEndDate(dateStr: string, timeStr: string | null, durationMinutes: number): string {
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(h, m + durationMinutes, 0, 0);
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  return dateStr.replace(/-/g, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  const from = new Date();
  from.setDate(from.getDate() - 7); // include 1 week back
  const fromStr = from.toISOString().slice(0, 10);

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT p.id, p.title, p.comp_team, p.practice_date, p.start_time,
                 p.duration_minutes, p.location, p.notes, p.is_recurring, p.recurrence_rule,
                 u.display_name as coach_name
          FROM practices p
          LEFT JOIN users u ON p.coach_id = u.id
          WHERE p.practice_date >= ?
          ${team && team !== "all" ? "AND (p.comp_team = ? OR p.comp_team IS NULL)" : ""}
          ORDER BY p.practice_date ASC, p.start_time ASC`,
    args: team && team !== "all" ? [fromStr, parseInt(team)] : [fromStr],
  });

  const calName = team && team !== "all" ? `Open Coach · Team ${team}` : "Open Coach · All Practices";
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const events = result.rows.map((p) => {
    const startDate = toIcalDate(p.practice_date as string, p.start_time as string | null);
    const endDate = toIcalEndDate(p.practice_date as string, p.start_time as string | null, (p.duration_minutes as number) || 90);
    const isAllDay = !p.start_time;

    const lines = [
      "BEGIN:VEVENT",
      `UID:practice-${p.id}@opencoach`,
      `DTSTAMP:${now}`,
      isAllDay ? `DTSTART;VALUE=DATE:${startDate}` : `DTSTART:${startDate}`,
      isAllDay ? `DTEND;VALUE=DATE:${endDate}` : `DTEND:${endDate}`,
      `SUMMARY:${escapeIcal(p.title as string)}`,
    ];

    const descParts: string[] = [];
    if (p.comp_team) descParts.push(`Team ${p.comp_team}`);
    if (p.coach_name) descParts.push(`Coach: ${p.coach_name}`);
    if (p.duration_minutes) descParts.push(`${p.duration_minutes} min`);
    if (p.is_recurring) descParts.push(p.recurrence_rule === "biweekly" ? "Bi-weekly" : "Weekly");
    if (p.notes) descParts.push(p.notes as string);

    if (descParts.length) lines.push(`DESCRIPTION:${escapeIcal(descParts.join(" · "))}`);
    if (p.location) lines.push(`LOCATION:${escapeIcal(p.location as string)}`);

    lines.push("END:VEVENT");
    return lines.join("\r\n");
  });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Open Coach//Practice Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    "X-WR-CALDESC:Climbing team practice schedule",
    "X-WR-TIMEZONE:America/New_York",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="opencoach.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatReadableDate(dateStr: string, timeStr: string | null) {
  const d = new Date(`${dateStr}T12:00:00`);
  const datePart = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (timeStr) return `${datePart} at ${timeStr}`;
  return datePart;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  const baseUrl = new URL(req.url).origin;
  const from = new Date();
  from.setDate(from.getDate() - 7);
  const fromStr = from.toISOString().slice(0, 10);

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT p.id, p.title, p.comp_team, p.practice_date, p.start_time,
                 p.duration_minutes, p.location, p.notes,
                 u.display_name as coach_name
          FROM practices p
          LEFT JOIN users u ON p.coach_id = u.id
          WHERE p.practice_date >= ?
          ${team && team !== "all" ? "AND (p.comp_team = ? OR p.comp_team IS NULL)" : ""}
          ORDER BY p.practice_date ASC, p.start_time ASC
          LIMIT 50`,
    args: team && team !== "all" ? [fromStr, parseInt(team)] : [fromStr],
  });

  const feedTitle = team && team !== "all" ? `Session Team · Team ${team} Practices` : "Session Team · All Practices";

  const items = result.rows.map((p) => {
    const descParts: string[] = [];
    if (p.comp_team) descParts.push(`Comp Team ${p.comp_team}`);
    if (p.coach_name) descParts.push(`Coach: ${p.coach_name}`);
    if (p.duration_minutes) descParts.push(`${p.duration_minutes} min`);
    if (p.location) descParts.push(p.location as string);
    if (p.notes) descParts.push(p.notes as string);

    const pubDate = new Date(`${p.practice_date}T12:00:00`).toUTCString();
    return `  <item>
    <title>${escapeXml(p.title as string)}</title>
    <description>${escapeXml(descParts.join(" · ") || "Practice")}</description>
    <pubDate>${pubDate}</pubDate>
    <guid isPermaLink="false">practice-${p.id}@opencoach</guid>
    <category>${escapeXml(formatReadableDate(p.practice_date as string, p.start_time as string | null))}</category>
  </item>`;
  }).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${baseUrl}/schedule</link>
    <description>Upcoming climbing team practice schedule</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(req.url)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

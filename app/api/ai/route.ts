import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, history } = await req.json();
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      response:
        "AI Coach is not configured yet. Add your ANTHROPIC_API_KEY to enable this feature. In the meantime, try the Assessment page for a free automated analysis!",
    });
  }

  const db = getDb();

  // Gather user context
  const [user, recentLogs, latestTest, assessment] = await Promise.all([
    db.execute({
      sql: `SELECT display_name, bodyweight_lbs, max_boulder_grade, target_boulder_grade FROM users WHERE id = ?`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT workout_name, protocol_type, rpe, weight_lbs, completed_at FROM logs
            WHERE user_id = ? ORDER BY completed_at DESC LIMIT 10`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT percent_bodyweight, total_weight_lbs, tested_at FROM tests
            WHERE user_id = ? ORDER BY tested_at DESC LIMIT 1`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT limiting_factor, recommendations FROM assessments
            WHERE user_id = ? ORDER BY assessed_at DESC LIMIT 1`,
      args: [session.userId],
    }),
  ]);

  const u = user.rows[0];
  const test = latestTest.rows[0];
  const assess = assessment.rows[0];

  const systemPrompt = `You are an expert climbing coach and sports scientist working with a climber through Open Coach, a free climbing training platform.

CLIMBER PROFILE:
- Name: ${u?.display_name || session.username}
- Bodyweight: ${u?.bodyweight_lbs ? `${u.bodyweight_lbs} lbs` : "unknown"}
- Current Grade: ${u?.max_boulder_grade || "unknown"} bouldering
- Target Grade: ${u?.target_boulder_grade || "unknown"}
- Max Hang (20mm, 10s): ${test ? `${Math.round(test.percent_bodyweight as number)}% bodyweight (${Math.round(test.total_weight_lbs as number)} lbs total)` : "not tested"}
- Assessment Limiting Factor: ${assess?.limiting_factor || "not assessed"}

RECENT TRAINING (last 10 sessions):
${recentLogs.rows.map((l) => `- ${l.workout_name} (${l.protocol_type}) RPE ${l.rpe || "N/A"} — ${l.completed_at}`).join("\n") || "No recent logs"}

COACHING APPROACH:
- Be concise but thorough — climbers want practical advice, not essays
- Always reference the climber's specific numbers when relevant
- Prioritize injury prevention alongside performance
- Recommend the assessment page for new users who haven't tested
- Be evidence-based but accessible
- When giving plans, structure them clearly with sets/reps/time
- Consider periodization and recovery — avoid recommending more than 3 hard sessions per week for most climbers`;

  try {
    const messages = [
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!aiRes.ok) {
      throw new Error("AI API error");
    }

    const aiData = await aiRes.json();
    const response = aiData.content[0]?.text || "I couldn't generate a response. Please try again.";

    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({
      response: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
}

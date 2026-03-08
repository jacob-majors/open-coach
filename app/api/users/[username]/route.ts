import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await getSession();
  const db = getDb();

  const userResult = await db.execute({
    sql: `SELECT id, username, display_name, bio, bodyweight_lbs, max_rope_grade, max_boulder_grade,
            target_rope_grade, target_boulder_grade, avatar_url, role, created_at
          FROM users WHERE username = ?`,
    args: [username.toLowerCase()],
  });

  if (userResult.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profileUser = userResult.rows[0];
  const profileUserId = profileUser.id as number;

  const [recentLogs, recentTests, publicPlans, followerCount, followingCount] = await Promise.all([
    db.execute({
      sql: `SELECT workout_name, protocol_type, rpe, completed_at FROM logs
            WHERE user_id = ? ORDER BY completed_at DESC LIMIT 5`,
      args: [profileUserId],
    }),
    db.execute({
      sql: `SELECT percent_bodyweight, total_weight_lbs, tested_at FROM tests
            WHERE user_id = ? ORDER BY tested_at DESC LIMIT 3`,
      args: [profileUserId],
    }),
    db.execute({
      sql: `SELECT id, title, focus, duration_weeks, is_certified FROM plans
            WHERE creator_id = ? AND is_public = 1 ORDER BY created_at DESC LIMIT 4`,
      args: [profileUserId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM followers WHERE following_id = ?`,
      args: [profileUserId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM followers WHERE follower_id = ?`,
      args: [profileUserId],
    }),
  ]);

  let isFollowing = false;
  if (session && session.userId !== profileUserId) {
    const followResult = await db.execute({
      sql: `SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?`,
      args: [session.userId, profileUserId],
    });
    isFollowing = followResult.rows.length > 0;
  }

  return NextResponse.json({
    user: profileUser,
    recentLogs: recentLogs.rows,
    recentTests: recentTests.rows,
    publicPlans: publicPlans.rows,
    followerCount: followerCount.rows[0]?.count || 0,
    followingCount: followingCount.rows[0]?.count || 0,
    isFollowing,
    isOwnProfile: session?.userId === profileUserId,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await getSession();
  if (!session || session.username !== username.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    displayName, bio, bodyweightLbs,
    maxRopeGrade, maxBoulderGrade,
    targetRopeGrade, targetBoulderGrade,
    role,
  } = body;

  const db = getDb();
  await db.execute({
    sql: `UPDATE users SET
            display_name = COALESCE(?, display_name),
            bio = COALESCE(?, bio),
            bodyweight_lbs = COALESCE(?, bodyweight_lbs),
            max_rope_grade = COALESCE(?, max_rope_grade),
            max_boulder_grade = COALESCE(?, max_boulder_grade),
            target_rope_grade = COALESCE(?, target_rope_grade),
            target_boulder_grade = COALESCE(?, target_boulder_grade),
            role = CASE WHEN ? IS NOT NULL THEN ? ELSE role END
          WHERE id = ?`,
    args: [
      displayName || null,
      bio || null,
      bodyweightLbs || null,
      maxRopeGrade || null,
      maxBoulderGrade || null,
      targetRopeGrade || null,
      targetBoulderGrade || null,
      role || null,
      role || null,
      session.userId,
    ],
  });

  return NextResponse.json({ success: true });
}

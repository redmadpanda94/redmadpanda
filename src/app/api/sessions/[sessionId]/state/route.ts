import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPublicState } from "@/lib/game/session-service";

/** Public, redacted snapshot used for first paint / reconnect (both host and team clients). */
export async function GET(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const admin = createAdminClient();
    const state = await buildPublicState(admin, sessionId);
    return NextResponse.json(state);
  } catch (error) {
    return handleApiError(error);
  }
}

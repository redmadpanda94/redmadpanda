import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireHost } from "@/lib/api-helpers";
import { parseCsvText, validateImportRows } from "@/lib/game/import";
import { parseXlsxBuffer } from "@/lib/game/import-xlsx";

export const runtime = "nodejs";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request, ctx: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await ctx.params;
    const { supabase, user } = await requireHost();

    const { data: game } = await supabase.from("games").select("id, owner_id").eq("id", gameId).maybeSingle();
    if (!game || game.owner_id !== user.id) throw new ApiError("Game not found.", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("No file provided.", 400);
    if (file.size > MAX_IMPORT_BYTES) throw new ApiError("File is too large (max 5MB).", 400);

    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    const rawRows = isCsv
      ? parseCsvText(await file.text())
      : await parseXlsxBuffer(await file.arrayBuffer());

    if (rawRows.length === 0) {
      throw new ApiError("No rows found in the file. Make sure the first row has headers.", 400);
    }
    if (rawRows.length > 2000) {
      throw new ApiError("That's a lot of rows! Please import 2000 or fewer at a time.", 400);
    }

    const preview = validateImportRows(rawRows);
    return NextResponse.json(preview);
  } catch (error) {
    return handleApiError(error);
  }
}

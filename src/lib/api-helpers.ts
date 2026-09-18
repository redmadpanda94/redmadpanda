import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Resolves the authenticated host user or throws a 401 ApiError. */
export async function requireHost() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new ApiError("You must be signed in as a host.", 401);
  return { supabase, user };
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid request." },
      { status: 400 }
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function parseJson<T>(request: Request, schema: { parse: (v: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("Invalid request body.", 400);
  }
  return schema.parse(body);
}

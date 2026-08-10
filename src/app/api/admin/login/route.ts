import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPassword, startAdminSession } from "@/lib/auth";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter the dashboard password." },
      { status: 400 },
    );
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured on the server." },
      { status: 500 },
    );
  }

  if (!checkPassword(parsed.data.password)) {
    return NextResponse.json(
      { error: "That password is not correct." },
      { status: 401 },
    );
  }

  await startAdminSession();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await client.getToken(code);

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui;max-width:640px;margin:2rem auto;padding:1rem">
<h1>Google Calendar connected</h1>
<p>Add this to <code>.env.local</code>:</p>
<pre style="background:#f4f4f5;padding:1rem;overflow:auto">GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || "(none — revoke app and try again with prompt=consent)"}
GOOGLE_CALENDAR_ID=primary</pre>
<p>Then restart <code>npm run dev</code> and run <code>npm run update:inbound</code>.</p>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

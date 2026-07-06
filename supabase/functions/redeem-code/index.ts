// Supabase Edge Function: redeem-code
// Deploy:  supabase functions deploy redeem-code
// The plaintext code NEVER exists here or in the app — only its SHA-256 hash
// lives in the redeem_codes table. Decompiling the app reveals nothing.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return json({ error: "No code provided." }, 400, cors);
    }

    // Identify the caller from their JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in." }, 401, cors);

    // Hash the submitted code
    const bytes = new TextEncoder().encode(code.trim().toUpperCase());
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    // Service-role client bypasses RLS for the codes table
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rc } = await admin.from("redeem_codes")
      .select("*").eq("code_hash", hash).eq("active", true).single();
    if (!rc) return json({ error: "Invalid code." }, 400, cors);
    if (rc.use_count >= rc.max_uses) return json({ error: "Code fully redeemed." }, 400, cors);

    const { error: already } = await admin.from("redemptions")
      .insert({ user_id: user.id, code_hash: hash });
    if (already) return json({ error: "You already redeemed this code." }, 400, cors);

    await admin.from("redeem_codes")
      .update({ use_count: rc.use_count + 1 }).eq("code_hash", hash);

    if (rc.grants === "premium_forever") {
      await admin.from("profiles")
        .update({ premium_forever: true }).eq("id", user.id);
    }

    return json({ ok: true, grants: rc.grants }, 200, cors);
  } catch {
    return json({ error: "Something went wrong. Try again." }, 500, cors);
  }
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

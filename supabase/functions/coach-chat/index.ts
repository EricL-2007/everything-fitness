// Supabase Edge Function: coach-chat
// LLM-powered Coach Er. The Anthropic API key lives only in Edge Function
// secrets — never in the client bundle.
// Deploy:  supabase functions deploy coach-chat
// Secret:  supabase secrets set ANTHROPIC_API_KEY=your_key
// Optional: supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5
//           (defaults to claude-opus-4-8; Haiku is a cheaper/faster swap for
//           a lightweight daily coach if you'd rather not run Opus-tier cost)

import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";
const HISTORY_LIMIT = 20;

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string" || !message.trim()) {
      return json({ error: "No message provided." }, 400, cors);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in." }, 401, cors);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: profile }, { data: workouts }, { data: foodLogs }, { data: history }] =
      await Promise.all([
        admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        admin.from("workouts").select("split_day, started_at, ended_at, workout_sets(count)")
          .eq("user_id", user.id).not("ended_at", "is", null)
          .order("started_at", { ascending: false }).limit(10),
        admin.from("food_logs").select("kcal, protein_g, logged_on")
          .eq("user_id", user.id)
          .gte("logged_on", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
        admin.from("coach_messages").select("role, content").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(HISTORY_LIMIT),
      ]);

    const system = buildSystemPrompt(profile, workouts ?? [], foodLogs ?? []);
    const priorTurns = (history ?? []).reverse().map((m: any) => ({
      role: m.role,
      content: [{ type: "text", text: m.content }],
    }));

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "AI Coach isn't configured yet." }, 500, cors);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system,
        messages: [...priorTurns, { role: "user", content: [{ type: "text", text: message }] }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Anthropic API error", res.status, errBody);
      return json({ error: "Coach Er couldn't respond just now." }, 502, cors);
    }

    const data = await res.json();
    if (data.stop_reason === "refusal") {
      return json({ error: "Coach Er can't help with that one." }, 200, cors);
    }
    const textBlock = (data.content ?? []).find((b: any) => b.type === "text");
    const reply = textBlock?.text ?? "Sorry, I didn't catch that — try asking again.";

    await admin.from("coach_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    return json({ reply }, 200, cors);
  } catch (err) {
    console.error(err);
    return json({ error: "Something went wrong. Try again." }, 500, cors);
  }
});

function buildSystemPrompt(profile: any, workouts: any[], foodLogs: any[]): string {
  const goal = profile?.goal ?? "unknown";
  const split = profile?.split_label ?? profile?.split ?? "unknown";
  const kcalTarget = profile?.calorie_target;
  const proteinTarget = profile?.protein_target_g;
  const mode = profile?.training_mode ?? "gym";

  const workoutSummary = workouts.length
    ? workouts.map((w) =>
        `${w.split_day} (${String(w.started_at).slice(0, 10)}, ${w.workout_sets?.[0]?.count ?? 0} sets)`,
      ).join("; ")
    : "no logged sessions yet";

  const days = new Map<string, { kcal: number; protein: number }>();
  for (const f of foodLogs) {
    const d = days.get(f.logged_on) ?? { kcal: 0, protein: 0 };
    d.kcal += Number(f.kcal) || 0;
    d.protein += Number(f.protein_g) || 0;
    days.set(f.logged_on, d);
  }
  const nutritionSummary = days.size
    ? [...days.entries()]
        .map(([d, v]) => `${d}: ${Math.round(v.kcal)} kcal / ${Math.round(v.protein)} g protein`)
        .join("; ")
    : "no logged meals this week";

  return [
    "You are Coach Er, a friendly, encouraging fitness coach inside the Everything Fitness app.",
    "Give concise, practical advice (a few sentences, not an essay) grounded in the user's actual data below.",
    "You are not a doctor — never give medical diagnoses; suggest consulting a physician for injuries or medical concerns.",
    "",
    `Goal: ${goal}. Training mode: ${mode}. Split: ${split}.`,
    `Daily targets: ${kcalTarget ?? "?"} kcal, ${proteinTarget ?? "?"} g protein.`,
    `Recent workout history: ${workoutSummary}.`,
    `Nutrition this week: ${nutritionSummary}.`,
  ].join("\n");
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

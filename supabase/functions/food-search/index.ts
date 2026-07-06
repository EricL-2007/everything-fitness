// Supabase Edge Function: food-search
// Proxies USDA FoodData Central so the API key never ships in the app.
// Deploy:  supabase functions deploy food-search
// Secret:  supabase secrets set USDA_API_KEY=your_key   (free at fdc.nal.usda.gov)
// Falls back to DEMO_KEY (rate-limited) if no secret is set — fine for dev.

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { query } = await req.json();
    if (!query) return resp({ foods: [] }, cors);

    const key = Deno.env.get("USDA_API_KEY") ?? "DEMO_KEY";
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}` +
      `&query=${encodeURIComponent(query)}&pageSize=15` +
      `&dataType=Foundation,SR%20Legacy,Branded`;

    const usda = await fetch(url);
    const data = await usda.json();

    const foods = (data.foods ?? []).map((f: any) => {
      const n = (id: number) =>
        f.foodNutrients?.find((x: any) => x.nutrientId === id)?.value ?? 0;
      return {
        usda_fdc_id: f.fdcId,
        name: f.description,
        brand: f.brandOwner ?? null,
        serving_desc: f.servingSize
          ? `${f.servingSize} ${f.servingSizeUnit ?? "g"}`
          : "100 g",
        serving_grams: f.servingSize ?? 100,
        // USDA reports per 100 g; nutrient IDs: 1008 kcal, 1003 protein, 1005 carbs, 1004 fat
        kcal: n(1008),
        protein_g: n(1003),
        carbs_g: n(1005),
        fat_g: n(1004),
      };
    });

    return resp({ foods }, cors);
  } catch {
    return resp({ foods: [], error: "Search failed." }, cors, 500);
  }
});

function resp(body: unknown, cors: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSession } from "../_layout";
import { Button, Card, H1, Input, Label, Pills, Screen } from "../../components/UI";
import { supabase } from "../../lib/supabase";
import { colors, type } from "../../lib/theme";
import { touchStreak, useToday } from "../../lib/useToday";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
type FoodResult = {
  id?: string; usda_fdc_id?: number; name: string; brand?: string | null;
  serving_desc: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number;
};

export default function Nutrition() {
  const { session, refreshProfile } = useSession();
  const uid = session!.user.id;
  const t = useToday(uid);

  const [meal, setMeal] = useState<Meal>("lunch");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  const [recents, setRecents] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [servings, setServings] = useState("1");

  const loadShortcuts = useCallback(async () => {
    const [{ data: r }, { data: f }] = await Promise.all([
      supabase.from("food_logs").select("name, kcal, protein_g, carbs_g, fat_g, food_id")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(30),
      supabase.from("favorite_foods").select("food_id, foods(*)").eq("user_id", uid),
    ]);
    // de-dupe recents by name
    const seen = new Set<string>();
    setRecents((r ?? []).filter((x) => !seen.has(x.name) && seen.add(x.name)).slice(0, 6));
    setFavorites((f ?? []).map((x: any) => x.foods).filter(Boolean));
  }, [uid]);

  useFocusEffect(useCallback(() => { loadShortcuts(); t.refresh(); }, [loadShortcuts, t.refresh]));

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      // 1. Local seeded/custom foods — instant, works with only the schema applied.
      const { data: local } = await supabase
        .from("foods")
        .select("id, name, brand, serving_desc, kcal, protein_g, carbs_g, fat_g")
        .ilike("name", `%${q.trim()}%`)
        .limit(20);
      const localResults: FoodResult[] = local ?? [];

      // 2. USDA via the edge function — only if it's deployed. Failure is non-fatal:
      //    you still get the local results above.
      let usdaResults: FoodResult[] = [];
      try {
        const { data } = await supabase.functions.invoke("food-search", { body: { query: q.trim() } });
        usdaResults = data?.foods ?? [];
      } catch {
        // edge function not deployed yet — ignore, local results are enough
      }

      // De-dupe by name (local wins) and show local first.
      const seen = new Set(localResults.map((r) => r.name.toLowerCase()));
      const merged = [...localResults, ...usdaResults.filter((r) => !seen.has(r.name.toLowerCase()))];
      setResults(merged);
    } finally {
      setSearching(false);
    }
  };

  const log = async (food: FoodResult) => {
    const s = Math.max(0.1, Number(servings) || 1);
    // Cache USDA results into our foods table so favorites/recents can reference them
    let foodId = food.id ?? null;
    if (!foodId && food.usda_fdc_id) {
      const { data } = await supabase.from("foods").insert({
        name: food.name, brand: food.brand, serving_desc: food.serving_desc,
        kcal: food.kcal, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g,
        source: "usda", usda_fdc_id: food.usda_fdc_id, owner: uid,
      }).select("id").single();
      foodId = data?.id ?? null;
    }
    await supabase.from("food_logs").insert({
      user_id: uid, food_id: foodId, name: food.name, meal, servings: s,
      kcal: food.kcal * s, protein_g: food.protein_g * s,
      carbs_g: food.carbs_g * s, fat_g: food.fat_g * s,
    });
    await touchStreak();
    setResults([]); setQ("");
    await Promise.all([t.refresh(), loadShortcuts(), refreshProfile()]);
  };

  const favorite = async (foodId: string) => {
    await supabase.from("favorite_foods").upsert({ user_id: uid, food_id: foodId });
    loadShortcuts();
  };

  const FoodRow = ({ f, onFav }: { f: FoodResult & { food_id?: string }; onFav?: () => void }) => (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontSize: 15 }} numberOfLines={1}>{f.name}</Text>
        <Text style={{ color: colors.steel, fontSize: 12 }}>
          {f.serving_desc ?? "1 serving"} · {Math.round(f.kcal)} kcal · P {Math.round(f.protein_g)} / C {Math.round(f.carbs_g)} / F {Math.round(f.fat_g)}
        </Text>
      </View>
      {onFav && (
        <Pressable onPress={onFav} style={{ padding: 6 }}>
          <Text style={{ fontSize: 16 }}>☆</Text>
        </Pressable>
      )}
      <Pressable onPress={() => log(f)}
        style={{ backgroundColor: colors.cobaltSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 6 }}>
        <Text style={{ color: colors.cobalt, fontFamily: type.displayMed }}>Log</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen>
      <H1>Nutrition</H1>
      <Text style={{ color: colors.steel, marginTop: 4 }}>
        {Math.round(t.kcal)} kcal logged today
      </Text>

      <Label>Meal</Label>
      <Pills options={["breakfast", "lunch", "dinner", "snack"] as const} value={meal} onChange={setMeal}
        labels={{ breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" }} />

      <Label>Servings</Label>
      <Input value={servings} onChangeText={setServings} keyboardType="decimal-pad" style={{ width: 100 }} />

      <Label>Search foods (USDA database)</Label>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Input value={q} onChangeText={setQ} placeholder="grilled chicken breast" style={{ flex: 1 }}
          onSubmitEditing={search} returnKeyType="search" />
        <Pressable onPress={search} style={{ backgroundColor: colors.cobalt, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontFamily: type.displayMed }}>Search</Text>
        </Pressable>
      </View>

      {searching && <ActivityIndicator color={colors.cobalt} style={{ marginTop: 16 }} />}
      {results.length > 0 && (
        <Card style={{ marginTop: 12 }}>
          {results.map((f, i) => <FoodRow key={i} f={f} />)}
        </Card>
      )}

      {favorites.length > 0 && (
        <>
          <Label>★ Favorites</Label>
          <Card>{favorites.map((f) => <FoodRow key={f.id} f={f} />)}</Card>
        </>
      )}

      {recents.length > 0 && (
        <>
          <Label>Recent</Label>
          <Card>
            {recents.map((f, i) => (
              <FoodRow key={i} f={{ ...f, serving_desc: "1 serving" }}
                onFav={f.food_id ? () => favorite(f.food_id) : undefined} />
            ))}
          </Card>
        </>
      )}

      <CustomFood uid={uid} onLogged={() => { t.refresh(); loadShortcuts(); }} meal={meal} />

      {/* Today's log */}
      {t.foodLogs.length > 0 && (
        <>
          <Label>Logged today</Label>
          <Card>
            {t.foodLogs.map((l) => (
              <View key={l.id} style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink }} numberOfLines={1}>{l.name}</Text>
                  <Text style={{ color: colors.steel, fontSize: 12 }}>
                    {l.meal} · {l.servings}× · {Math.round(l.kcal)} kcal
                  </Text>
                </View>
                <Pressable onPress={async () => {
                  await supabase.from("food_logs").delete().eq("id", l.id);
                  t.refresh();
                }}>
                  <Text style={{ color: colors.coral, fontSize: 13 }}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

/** Quick manual entry for foods not in the database. */
function CustomFood({ uid, meal, onLogged }: { uid: string; meal: Meal; onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState(""); const [p, setP] = useState("");
  const [c, setC] = useState(""); const [f, setF] = useState("");

  const save = async () => {
    const { data: food } = await supabase.from("foods").insert({
      name: name.trim(), serving_desc: "1 serving", kcal: Number(kcal) || 0,
      protein_g: Number(p) || 0, carbs_g: Number(c) || 0, fat_g: Number(f) || 0,
      source: "custom", owner: uid,
    }).select("id").single();
    await supabase.from("food_logs").insert({
      user_id: uid, food_id: food?.id, name: name.trim(), meal, servings: 1,
      kcal: Number(kcal) || 0, protein_g: Number(p) || 0, carbs_g: Number(c) || 0, fat_g: Number(f) || 0,
    });
    await touchStreak();
    setName(""); setKcal(""); setP(""); setC(""); setF(""); setOpen(false);
    onLogged();
  };

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.cobalt, fontFamily: type.displayMed }}>+ Add a custom food</Text>
      </Pressable>
    );
  }
  return (
    <Card style={{ marginTop: 16 }}>
      <Label>Food name</Label>
      <Input value={name} onChangeText={setName} placeholder="Mom's chicken alfredo" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[["kcal", kcal, setKcal], ["P (g)", p, setP], ["C (g)", c, setC], ["F (g)", f, setF]].map(([lab, val, set]: any) => (
          <View key={lab} style={{ flex: 1 }}>
            <Label>{lab}</Label>
            <Input value={val} onChangeText={set} keyboardType="decimal-pad" />
          </View>
        ))}
      </View>
      <Button title="Log it" onPress={save} disabled={!name.trim() || !kcal} />
    </Card>
  );
}

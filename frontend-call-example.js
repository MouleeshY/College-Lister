// Example: call this from your Dashboard view (add a "Get AI recommendation" button).
// Requires: const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) already set up.

async function getAIRanking(goalText = "") {
  const { data: schools } = await supabase.from("schools").select("*");

  const { data, error } = await supabase.functions.invoke("rank-schools", {
    body: { schools, goal: goalText },
  });

  if (error) {
    console.error(error);
    alert("AI ranking failed — check that the edge function is deployed and GEMINI_API_KEY is set.");
    return;
  }

  // data.ranking -> [{ name, rank, rationale }, ...]
  // data.recommendation -> "string"
  console.log(data.ranking, data.recommendation);
  // render these into the Dashboard view, e.g. a new "AI Take" card
}

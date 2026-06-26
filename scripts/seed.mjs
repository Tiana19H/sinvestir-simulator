import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Manque SUPABASE_URL ou SUPABASE_SERVICE_KEY dans .env");
  process.exit(1);
}

const cgKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "";
const CHUNK_SIZE = 500;

async function supabaseFetch(path, options = {}) {
  const url = `${supabaseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  return res;
}

async function seedList() {
  console.log("Récupération de la liste des cryptos depuis CoinGecko...");
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=200&page=1",
    { headers: { "x-cg-demo-api-key": cgKey } }
  );
  if (!res.ok) throw new Error(`CoinGecko list error: ${res.status}`);
  const data = await res.json();

  const cryptos = data.map((c) => ({
    id: c.id,
    nom: c.name,
    symbole: c.symbol.toUpperCase(),
  }));

  const { error } = await supabaseFetch("/rest/v1/crypto_list", {
    method: "POST",
    body: JSON.stringify(cryptos),
    headers: { Prefer: "resolution=merge-duplicates" },
  }).then((r) => r.json());

  if (error) throw error;
  console.log(`✓ ${cryptos.length} cryptos insérées/mises à jour`);
  return cryptos;
}

async function fetchCoinGeckoPrices(cryptoId) {
  const fin = Date.now();
  const debut = fin - 365 * 24 * 60 * 60 * 1000;
  const url = `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart/range?vs_currency=eur&from=${debut / 1000}&to=${fin / 1000}`;
  const res = await fetch(url, { headers: { "x-cg-demo-api-key": cgKey } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.prices?.length) return null;
  return data.prices.map((p) => ({ crypto_id: cryptoId, timestamp: p[0], prix: p[1] }));
}

async function seedPrices(cryptos) {
  let total = 0;

  for (let i = 0; i < cryptos.length; i++) {
    const c = cryptos[i];
    console.log(`[${i + 1}/${cryptos.length}] ${c.nom}...`);

    try {
      const rows = await fetchCoinGeckoPrices(c.id);
      if (!rows || rows.length === 0) {
        console.warn(`  ⚠ Aucune donnée`);
        continue;
      }

      for (let j = 0; j < rows.length; j += CHUNK_SIZE) {
        await supabaseFetch("/rest/v1/crypto_prices", {
          method: "POST",
          body: JSON.stringify(rows.slice(j, j + CHUNK_SIZE)),
          headers: { Prefer: "resolution=merge-duplicates" },
        });
      }

      console.log(`  ✓ ${rows.length} jours`);
      total += rows.length;
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.warn(`  ⚠ ${e.message}`);
    }
  }

  return total;
}

async function main() {
  console.log("=== SEED CoinGecko → Supabase ===\n");
  const cryptos = await seedList();
  console.log("");
  const total = await seedPrices(cryptos);
  console.log(`\n✓ Seed terminé ! ${total} prix insérés pour ${cryptos.length} cryptos`);
}

main().catch((e) => {
  console.error("Erreur:", e.message);
  process.exit(1);
});

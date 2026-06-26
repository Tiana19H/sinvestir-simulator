import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { WebSocket } from "ws";

if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Manque SUPABASE_URL ou SUPABASE_SERVICE_KEY dans .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BINANCE_BASE = "https://api.binance.com";

async function getBinanceSymbols() {
  const res = await fetch(`${BINANCE_BASE}/api/v3/exchangeInfo`);
  if (!res.ok) throw new Error(`Binance exchangeInfo: ${res.status}`);
  const data = await res.json();
  const usdtPairs = new Set(
    data.symbols
      .filter((s) => s.quoteAsset === "USDT" && s.status === "TRADING")
      .map((s) => s.symbol)
  );
  console.log(`✓ ${usdtPairs.size} paires USDT disponibles sur Binance`);
  return usdtPairs;
}

async function seedList() {
  console.log("Récupération de la liste des cryptos depuis CoinGecko...");
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=200&page=1",
    {
      headers: {
        "x-cg-demo-api-key": process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "",
      },
    }
  );
  if (!res.ok) throw new Error(`CoinGecko list error: ${res.status}`);
  const data = await res.json();

  const cryptos = data.map((c) => ({
    id: c.id,
    nom: c.name,
    symbole: c.symbol.toUpperCase(),
  }));

  const { error } = await supabase
    .from("crypto_list")
    .upsert(cryptos, { onConflict: "id" });

  if (error) throw error;
  console.log(`✓ ${cryptos.length} cryptos insérées/mises à jour`);
  return cryptos;
}

async function fetchBinanceKlines(symbol, startTime) {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${startTime}&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

async function fetchCoinGeckoPrices(cryptoId) {
  const fin = Date.now();
  const debut = fin - 365 * 24 * 60 * 60 * 1000;
  const url = `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart/range?vs_currency=eur&from=${debut / 1000}&to=${fin / 1000}`;

  const res = await fetch(url, {
    headers: {
      "x-cg-demo-api-key": process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.prices || data.prices.length === 0) return null;

  return data.prices.map((p) => ({
    crypto_id: cryptoId,
    timestamp: p[0],
    prix: p[1],
  }));
}

async function storeRows(rows, chunkSize) {
  for (let j = 0; j < rows.length; j += chunkSize) {
    const chunk = rows.slice(j, j + chunkSize);
    const { error } = await supabase
      .from("crypto_prices")
      .upsert(chunk, { onConflict: "crypto_id,timestamp" });
    if (error) return error;
  }
  return null;
}

async function seedPrices(cryptos, binancePairs) {
  const chunkSize = 500;
  let total = 0;

  for (let i = 0; i < cryptos.length; i++) {
    const c = cryptos[i];
    const binanceSymbol = c.symbole + "USDT";

    const onBinance = binancePairs.has(binanceSymbol);
    console.log(`[${i + 1}/${cryptos.length}] ${c.nom}${onBinance ? ` (${binanceSymbol})` : " (via CoinGecko)"}...`);

    try {
      let rows = [];

      if (onBinance) {
        const allKlines = [];
        let startTime = 0;

        while (true) {
          const klines = await fetchBinanceKlines(binanceSymbol, startTime);
          if (!klines || klines.length === 0) break;
          allKlines.push(...klines);
          if (klines.length < 1000) break;
          startTime = klines[klines.length - 1][0] + 1;
          await new Promise((r) => setTimeout(r, 100));
        }

        rows = allKlines.map((k) => ({
          crypto_id: c.id,
          timestamp: k[0],
          prix: parseFloat(k[4]),
        }));
      } else {
        const cgRows = await fetchCoinGeckoPrices(c.id);
        if (cgRows) rows = cgRows;
      }

      if (rows.length === 0) {
        console.warn(`  ⚠ Aucune donnée`);
        continue;
      }

      const err = await storeRows(rows, chunkSize);
      if (err) {
        console.warn(`  ⚠ Supabase error: ${err.message}`);
      } else {
        console.log(`  ✓ ${rows.length} jours`);
        total += rows.length;
      }

      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.warn(`  ⚠ ${e.message}`);
    }
  }

  return total;
}

async function main() {
  console.log("=== SEED Binance → Supabase ===\n");
  const binancePairs = await getBinanceSymbols();
  console.log("");
  const cryptos = await seedList();
  console.log("");
  const total = await seedPrices(cryptos, binancePairs);
  console.log(`\n✓ Seed terminé ! ${total} prix insérés pour ${cryptos.length} cryptos`);
}

main().catch((e) => {
  console.error("Erreur:", e.message);
  process.exit(1);
});

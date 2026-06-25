import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const COINGECKO_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "";

export async function GET() {
    const debut = Date.now();
    try {
        const { data: cryptos } = await supabase
            .from("crypto_list")
            .select("id");
        if (!cryptos || cryptos.length === 0) {
            return NextResponse.json({ ok: false, error: "Liste vide" }, { status: 400 });
        }

        const rand = cryptos[Math.floor(Math.random() * cryptos.length)];
        const fin = Date.now();
        const start = fin - 30 * 24 * 60 * 60 * 1000;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${rand.id}/market_chart/range?vs_currency=eur&from=${start / 1000}&to=${fin / 1000}`,
            { headers: { "x-cg-demo-api-key": COINGECKO_KEY }, signal: controller.signal }
        );
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            if (data?.prices?.length) {
                const rows = data.prices.map((p: any) => ({
                    crypto_id: rand.id,
                    timestamp: p[0],
                    prix: p[1],
                }));
                await supabase.from("crypto_prices").upsert(rows, { onConflict: "crypto_id,timestamp" });
            }
        }

        return NextResponse.json({ ok: true, crypto: rand.id, ms: Date.now() - debut });
    } catch (e) {
        return NextResponse.json({ ok: false, error: (e as Error).message, ms: Date.now() - debut }, { status: 500 });
    }
}

import { supabase } from "@/lib/supabase";

async function storePrixSupabase(cryptoId: string, prix: [number, number][]) {
    const rows = prix.map(([timestamp, p]) => ({
        crypto_id: cryptoId,
        timestamp,
        prix: p,
    }));

    for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await supabase
            .from("crypto_prices")
            .upsert(chunk, { onConflict: "crypto_id,timestamp" });
        if (error) console.error("Cache Supabase:", error.message);
    }
}

async function cryptoADesDonnees(cryptoId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("crypto_prices")
        .select("timestamp")
        .eq("crypto_id", cryptoId)
        .limit(1);
    return !error && data !== null && data.length > 0;
}

export async function fetchPrixHistoriques(
    cryptoId: string,
    dateDebut: string,
    dateFin: string
): Promise<{ prix: [number, number][]; avertissement?: string }> {
    const debut = new Date(dateDebut).getTime();
    const fin = new Date(dateFin).getTime();

    const { data: prixSupabase, error } = await supabase
        .from("crypto_prices")
        .select("timestamp,prix")
        .eq("crypto_id", cryptoId)
        .gte("timestamp", debut)
        .lte("timestamp", fin)
        .order("timestamp");

    if (!error && prixSupabase && prixSupabase.length > 1) {
        return {
            prix: prixSupabase.map((p) => [p.timestamp, p.prix] as [number, number]),
        };
    }

    const dispoFin = Date.now();
    const dispoDebut = dispoFin - 365 * 24 * 60 * 60 * 1000;

    if (fin <= dispoDebut) {
        const aDesDonnees = await cryptoADesDonnees(cryptoId);
        if (aDesDonnees) {
            throw new Error("Période trop ancienne pour CoinGecko. Les données Supabase commencent après cette date.");
        }
        throw new Error(
            "Cette crypto n'a pas encore été indexée dans Supabase et CoinGecko ne fournit que les 365 derniers jours. Lancez `npm run seed` pour l'ajouter."
        );
    }

    const debutReel = Math.max(debut, dispoDebut);
    let avertissement: string | undefined;

    if (debut < dispoDebut) {
        const debutStr = new Date(dispoDebut).toISOString().split("T")[0];
        const finStr = new Date(fin).toISOString().split("T")[0];
        avertissement = `Données limitées aux 365 derniers jours par CoinGecko. Résultats basés sur la période du ${debutStr} au ${finStr}.`;
    }

    const url = `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart/range?vs_currency=eur&from=${debutReel / 1000}&to=${fin / 1000}`;
    const reponse = await fetch(url, {
        headers: {
            "x-cg-demo-api-key": process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "",
        },
    });
    if (reponse.status === 429) {
        throw new Error("Trop de requêtes. Attendez 30 secondes avant de relancer.");
    }
    if (!reponse.ok) {
        throw new Error(`CoinGecko (${reponse.status}) — données non disponibles`);
    }
    const donnees = await reponse.json();
    if (!donnees.prices) {
        throw new Error(
            donnees?.error?.status?.error_message || "Erreur lors du chargement des données"
        );
    }

    storePrixSupabase(cryptoId, donnees.prices).catch(() => {});

    return { prix: donnees.prices, avertissement };
}

export async function fetchCryptoList() {
    const { data: listeSupabase, error } = await supabase
        .from("crypto_list")
        .select("id,nom,symbole")
        .order("nom");

    if (!error && listeSupabase && listeSupabase.length > 0) {
        return listeSupabase;
    }

    const reponse = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=100&page=1",
        {
            headers: {
                "x-cg-demo-api-key": process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "",
            },
        }
    );
    if (reponse.status === 429) {
        throw new Error("Trop de requêtes. Attendez 30 secondes.");
    }
    if (!reponse.ok) {
        throw new Error(`Erreur CoinGecko (${reponse.status})`);
    }
    const donnees = await reponse.json();
    if (!Array.isArray(donnees)) {
        throw new Error("Erreur lors du chargement de la liste des cryptos");
    }
    return donnees.map((crypto: { id: string; name: string; symbol: string }) => ({
        id: crypto.id,
        nom: crypto.name,
        symbole: crypto.symbol.toUpperCase(),
    }));
}

export function calculerInvestissement(
    prix: [number, number][],
    montant: number,
    frequence: string,
    dateDebut: string,
    dateFin: string
) {
    if (prix.length === 0) {
        return {
            totalInvesti: 0,
            valeurFinale: 0,
            gain: 0,
            gainPourcentage: 0,
            evolution: [],
        };
    }

    const debut = new Date(dateDebut).getTime();
    const fin = new Date(dateFin).getTime();
    let totalInvesti = 0;
    let quantite = 0;
    const evolution: [number, number, number][] = [];

    let premier = true;
    for (const [timestamp, prixUnitaire] of prix) {
        if (timestamp < debut || timestamp > fin) continue;

        let acheter = false;
        if (frequence === "once") {
            acheter = premier;
        } else {
            const jour = new Date(timestamp);
            const jourDebut = new Date(dateDebut);
            if (frequence === "daily") acheter = true;
            else if (frequence === "weekly") acheter = jour.getDay() === jourDebut.getDay();
            else if (frequence === "monthly") acheter = jour.getDate() === jourDebut.getDate();
        }

        if (acheter) premier = false;

        if (acheter) {
            totalInvesti += montant;
            quantite += montant / prixUnitaire;
        }

        evolution.push([timestamp, totalInvesti, quantite * prixUnitaire]);
    }

    const dernierPrix = prix[prix.length - 1][1];
    const valeurFinale = quantite * dernierPrix;

    return {
        totalInvesti,
        valeurFinale,
        gain: valeurFinale - totalInvesti,
        gainPourcentage: ((valeurFinale - totalInvesti) / totalInvesti) * 100,
        evolution,
    };
}

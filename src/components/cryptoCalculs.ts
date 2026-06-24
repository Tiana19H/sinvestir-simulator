export async function fetchPrixHistoriques(
    cryptoId: string,
    dateDebut: string,
    dateFin: string
) {
    const debut = new Date(dateDebut).getTime();
    const fin = new Date(dateFin).getTime();
    const url = `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart/range?vs_currency=eur&from=${debut / 1000}&to=${fin / 1000}`;
    const reponse = await fetch(url, {
        headers: {
            "x-cg-demo-api-key": process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "",
        },
    });
    if (reponse.status === 429) {
        throw new Error("Trop de requêtes. Attendez 30 secondes avant de relancer.");
    }
    if (!reponse.ok) {
        throw new Error(`Erreur CoinGecko (${reponse.status})`);
    }
    const donnees = await reponse.json();
    if (!donnees.prices) {
        throw new Error(
            donnees?.error?.status?.error_message || "Erreur lors du chargement des données"
        );
    }
    return donnees.prices;
}

export async function fetchCryptoList() {
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

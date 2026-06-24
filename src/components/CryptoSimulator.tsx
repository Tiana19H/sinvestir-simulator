"use client";

import { useState, useEffect } from "react";
import CryptoForm from "./CryptoForm";
import CryptoResultats from "./CryptoResultats";
import CryptoChart from "./CryptoChart";
import { fetchPrixHistoriques, fetchCryptoList, calculerInvestissement } from "./cryptoCalculs";

export default function CryptoSimulator() {
    const [resultats, setResultats] = useState<null | {
        totalInvesti: number;
        valeurFinale: number;
        gain: number;
        gainPourcentage: number;
        evolution: [number, number, number][];
    }>(null);

    const [loading, setLoading] = useState(false);
    const [erreur, setErreur] = useState("");
    const [avertissement, setAvertissement] = useState("");
    const [cryptoList, setCryptoList] = useState<{ id: string; nom: string; symbole: string }[]>([]);

    useEffect(() => {
        fetchCryptoList().then(setCryptoList).catch(console.error);
    }, []);

    async function lancerSimulation(
        crypto: string,
        montant: number,
        frequence: string,
        dateDebut: string,
        dateFin: string
    ) {
        setLoading(true);
        setErreur("");
        setAvertissement("");
        try {
            const prix = await fetchPrixHistoriques(crypto, dateDebut, dateFin);
            const calcul = calculerInvestissement(prix, montant, frequence, dateDebut, dateFin);
            setResultats(calcul);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg.includes("exceeds the allowed time range")) {
                const maintenant = new Date();
                const limite = new Date(maintenant.getTime() - 365 * 24 * 60 * 60 * 1000);
                const limiteStr = limite.toISOString().split("T")[0];
                if (new Date(dateFin) < limite) {
                    setErreur(`CoinGecko ne fournit que les 365 derniers jours. Choisissez une date de fin après le ${limiteStr}.`);
                    setResultats(null);
                } else {
                    const debutUtile = new Date(dateDebut) < limite ? limite : new Date(dateDebut);
                    const debutAPI = debutUtile.toISOString();
                    const debutCalc = debutUtile.toISOString().split("T")[0];
                    try {
                        const prix = await fetchPrixHistoriques(crypto, debutAPI, dateFin);
                        const calcul = calculerInvestissement(prix, montant, frequence, debutCalc, dateFin);
                        setResultats(calcul);
                        setAvertissement(
                            `CoinGecko limite les données aux 365 derniers jours. Résultats basés sur la période du ${debutCalc} au ${dateFin}.`
                        );
                    } catch {
                        setErreur("Impossible de récupérer les données. Réessayez dans quelques instants.");
                        setResultats(null);
                    }
                }
            } else {
                setErreur(msg || "Une erreur est survenue");
                setResultats(null);
            }
        }
        setLoading(false);
    }

    return (
        <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg bg-surface border border-border p-6">
            <CryptoForm onSimulate={lancerSimulation} cryptoList={cryptoList} />
        </div>
        <div className="rounded-lg bg-surface border border-border p-6">
            {loading ? (
            <p className="text-text-muted">Calcul en cours...</p>
            ) : erreur ? (
            <p className="text-error text-sm">{erreur}</p>
            ) : resultats ? (
            <>
                {avertissement && (
                <p className="text-xs text-text-muted mb-4 bg-surface-soft rounded-lg p-3 border border-border">
                    {avertissement}
                </p>
                )}
                <CryptoResultats {...resultats} />
            </>
            ) : (
            <p className="text-text-muted">
                Remplissez le formulaire et lancez la simulation.
            </p>
            )}
        </div>
        {resultats?.evolution && resultats.evolution.length > 1 && (
        <div className="lg:col-span-2 rounded-lg bg-surface border border-border p-6">
            <CryptoChart evolution={resultats.evolution} />
        </div>
        )}
        <p className="text-xs text-text-muted leading-relaxed mt-6 lg:col-span-2">
          Les résultats présentés par ce simulateur ne constituent pas un indicateur fiable des performances futures. Ils ont uniquement pour objectif d'illustrer les mécanismes d'un investissement sur une période donnée. Les crypto-actifs présentent une volatilité particulièrement élevée et comportent un risque de perte en capital partielle ou totale.
        </p>
        </div>
    );
}

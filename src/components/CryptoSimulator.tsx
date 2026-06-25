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
        fetchCryptoList()
            .then(setCryptoList)
            .catch((e) => {
                console.error(e);
                setAvertissement("Impossible de charger la liste des cryptos.");
            });
        fetch("/api/seed").catch(() => {});
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
            const { prix, avertissement: avertPrix } = await fetchPrixHistoriques(crypto, dateDebut, dateFin);
            if (avertPrix) setAvertissement(avertPrix);
            const calcul = calculerInvestissement(prix, montant, frequence, dateDebut, dateFin);
            setResultats(calcul);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            setErreur(msg || "Une erreur est survenue");
            setResultats(null);
        }
        setLoading(false);
    }

    return (
        <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg bg-surface border border-border p-6">
            <CryptoForm onSimulate={lancerSimulation} cryptoList={cryptoList} />
        </div>
        <div className="rounded-lg bg-surface border border-border p-6">
            {avertissement && !loading && (
                <p className="text-xs text-text-muted mb-4 bg-surface-soft rounded-lg p-3 border border-border">
                    {avertissement}
                </p>
            )}
            {loading ? (
            <p className="text-text-muted">Calcul en cours...</p>
            ) : erreur ? (
            <p className="text-error text-sm">{erreur}</p>
            ) : resultats ? (
                <CryptoResultats {...resultats} />
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

"use client";

import { useState } from "react";

export default function CryptoForm({
    onSimulate,
    cryptoList,
}: {
    onSimulate: (
        crypto: string,
        montant: number,
        frequence: string,
        dateDebut: string,
        dateFin: string
    ) => void;
    cryptoList: { id: string; nom: string; symbole: string }[];
}) {
    const [crypto, setCrypto] = useState("bitcoin");
    const [amount, setAmount] = useState(1000);
    const [frequency, setFrequency] = useState("monthly");

    const fin = new Date();
    const debut = new Date();
    debut.setFullYear(debut.getFullYear() - 1);

    const [startDate, setStartDate] = useState(debut.toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(fin.toISOString().split("T")[0]);

  return (
    <div className="space-y-6">
        <div>
            <label className="block text-sm font-medium mb-1">
                Cryptomonnaie
            </label>
            <select
                value={crypto}
                onChange={(e) => setCrypto(e.target.value)}
                className="w-full rounded-lg bg-surface-soft border border-border px-3 py-2 text-sm text-text"
            >
                {cryptoList.map((crypto) => (
                    <option key={crypto.id} value={crypto.id}>
                        {crypto.nom} ({crypto.symbole})
                    </option>
                ))}
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium mb-1">
                Montant investi (€)
            </label>
            <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg bg-surface-soft border border-border px-3 py-2 text-sm"
                placeholder="1000"
            />
        </div>
        <div>
            <label className="block text-sm font-medium mb-1">
                Fréquence d'investissement
            </label>
            <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-lg bg-surface-soft border border-border px-3 py-2 text-sm"
            >
                <option value="once">Une seule fois</option>
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
            </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">
                Date de début
                </label>
                <input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg bg-surface-soft border border-border px-3 py-2 text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">
                Date de fin
                </label>
                <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg bg-surface-soft border border-border px-3 py-2 text-sm"
                />
            </div>
        </div>
        <button
            onClick={() => onSimulate(crypto, amount, frequency, startDate, endDate)}
            className="w-full rounded-lg bg-brand text-black font-medium py-2 px-4 hover:opacity-90 transition-opacity"
            >
            Lancer la simulation
        </button>
    </div>
  );
}

"use client";

interface ResultatsProps {
    totalInvesti: number;
    valeurFinale: number;
    gain: number;
    gainPourcentage: number;
}

export default function CryptoResultats({
    totalInvesti,
    valeurFinale,
    gain,
    gainPourcentage,
}: ResultatsProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-surface-soft border border-border p-4">
                    <p className="text-sm text-text-muted">Total investi</p>
                    <p className="text-xl font-semibold">{totalInvesti.toLocaleString()} €</p>
                </div>
                <div className="rounded-lg bg-surface-soft border border-border p-4">
                    <p className="text-sm text-text-muted">Valeur finale</p>
                    <p className="text-xl font-semibold">{valeurFinale.toLocaleString()} €</p>
                </div>
                <div className="rounded-lg bg-surface-soft border border-border p-4">
                    <p className="text-sm text-text-muted">Gain / Perte</p>
                    <p className={`text-xl font-semibold ${gain >= 0 ? "text-success" : "text-error"}`}>
                        {gain >= 0 ? "+" : ""}{gain.toLocaleString()} €
                    </p>
                </div>
                <div className="rounded-lg bg-surface-soft border border-border p-4">
                    <p className="text-sm text-text-muted">Performance</p>
                    <p className={`text-xl font-semibold ${gainPourcentage >= 0 ? "text-success" : "text-error"}`}>
                        {gainPourcentage >= 0 ? "+" : ""}{gainPourcentage.toFixed(2)} %
                    </p>
                </div>
            </div>
        </div>
    );
}

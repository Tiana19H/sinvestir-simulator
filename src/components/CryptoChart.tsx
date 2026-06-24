"use client";

function formaterDate(ms: number) {
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formateurMonnaie(val: number) {
    return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0);
}

export default function CryptoChart({
    evolution,
}: {
    evolution: [number, number, number][];
}) {
    if (evolution.length < 2) return null;

    const largeur = 700;
    const hauteur = 320;
    const margeG = 60;
    const margeD = 20;
    const margeH = 30;
    const margeB = 50;

    const zoneX = margeG;
    const zoneY = margeH;
    const zoneW = largeur - margeG - margeD;
    const zoneH = hauteur - margeH - margeB;

    const dates = evolution.map((p) => p[0]);
    const dateMin = dates[0];
    const dateMax = dates[dates.length - 1];
    const investiMax = Math.max(...evolution.map((p) => p[1]));
    const valeurMax = Math.max(...evolution.map((p) => p[2]));
    const maxGlobal = Math.max(investiMax, valeurMax);

    if (maxGlobal === 0) return null;

    function x(date: number) {
        return zoneX + ((date - dateMin) / (dateMax - dateMin)) * zoneW;
    }

    function y(val: number) {
        return zoneY + zoneH - (val / maxGlobal) * zoneH;
    }

    const segments = evolution.slice(0, -1).map((p, i) => {
        const suivant = evolution[i + 1];
        const couleur = suivant[2] >= p[2] ? "#008a2e" : "#e60000";
        return (
            <line
                key={i}
                x1={x(p[0])}
                y1={y(p[2])}
                x2={x(suivant[0])}
                y2={y(suivant[2])}
                stroke={couleur}
                strokeWidth={2}
            />
        );
    });

    const pointsInvesti = evolution.map((p) => `${x(p[0])},${y(p[1])}`).join(" ");

    const graduationsY = 5;
    const graduationsX = 5;

    return (
        <div>
            <p className="text-xs text-text-muted mb-3">Évolution de l&apos;investissement</p>
            <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="w-full h-auto">
                <line x1={zoneX} y1={zoneY} x2={zoneX} y2={zoneY + zoneH} stroke="#333" />
                <line x1={zoneX} y1={zoneY + zoneH} x2={zoneX + zoneW} y2={zoneY + zoneH} stroke="#333" />

                <polyline points={pointsInvesti} fill="none" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4,4" />

                {segments}

                {Array.from({ length: graduationsY }, (_, i) => {
                    const val = (maxGlobal / (graduationsY - 1)) * i;
                    const py = zoneY + zoneH - (val / maxGlobal) * zoneH;
                    return (
                        <g key={i}>
                            <line x1={zoneX - 5} y1={py} x2={zoneX} y2={py} stroke="#555" />
                            <text x={zoneX - 8} y={py + 3} textAnchor="end" fill="#9ca3af" fontSize="10">
                                {formateurMonnaie(val)}
                            </text>
                            <line x1={zoneX} y1={py} x2={zoneX + zoneW} y2={py} stroke="#222" strokeWidth={0.5} />
                        </g>
                    );
                })}

                {Array.from({ length: graduationsX }, (_, i) => {
                    const date = dateMin + ((dateMax - dateMin) / (graduationsX - 1)) * i;
                    const px = x(date);
                    return (
                        <g key={i}>
                            <line x1={px} y1={zoneY + zoneH} x2={px} y2={zoneY + zoneH + 5} stroke="#555" />
                            <text x={px} y={zoneY + zoneH + 18} textAnchor="middle" fill="#9ca3af" fontSize="10">
                                {formaterDate(date)}
                            </text>
                        </g>
                    );
                })}

                <rect x={zoneX + zoneW - 220} y={6} width={10} height={10} fill="#9ca3af" rx={2} />
                <text x={zoneX + zoneW - 206} y={15} fill="#9ca3af" fontSize="11">Total investi</text>
                <rect x={zoneX + zoneW - 120} y={6} width={10} height={10} fill="#008a2e" rx={2} />
                <text x={zoneX + zoneW - 106} y={15} fill="#9ca3af" fontSize="11">Performance</text>
            </svg>
        </div>
    );
}

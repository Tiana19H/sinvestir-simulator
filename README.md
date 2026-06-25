# Simulateur Crypto — S'investir

Transposition du simulateur crypto de [sinvestir.fr](https://sinvestir.fr/simulateur-crypto-monnaie/) aux standards visuels de [simulateurs.sinvestir.fr](https://simulateurs.sinvestir.fr/).

## Stack

| Technologie | Justification |
|---|---|
| **Next.js 16** (App Router) | Stack interne S'investir |
| **TypeScript** | Typage strict, robustesse |
| **Tailwind CSS v4** | Design system, responsive |
| **Supabase** | Stockage données crypto, compatible stack interne |
| **Vercel** | Déploiement natif Next.js |

### Pourquoi Supabase plutôt qu'un appel API direct ?

Le plan gratuit CoinGecko limite l'historique à 365 jours. Pour offrir un historique illimité, un script seed alimente Supabase via **Binance API** (gratuit, données historiques complètes depuis 2017). Fallback automatique sur CoinGecko si une crypto n'est pas encore seedée.

## Fonctionnalités

- DCA (Dollar Cost Averaging) avec 4 fréquences
- 200+ cryptos (liste dynamique depuis CoinGecko)
- Graphique SVG pur (zéro dépendance) : courbe investi vs performance
- Résultats : total investi, valeur finale, gain/perte, performance %
- Gestion intelligente des limites CoinGecko (365 jours)
- Responsive desktop/mobile
- Thème dark identité S'investir

## Prérequis

- Node.js 20+
- Un compte Supabase (gratuit)
- Une clé API CoinGecko (gratuite)

## Installation

```bash
npm install
```

### Variables d'environnement

Créez un fichier `.env.local` :

```env
NEXT_PUBLIC_COINGECKO_API_KEY=votre_clé_ici
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_ici
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=votre_clé_service_ici
```

### Base de données (Supabase)

Exécutez ce SQL dans **Supabase → SQL Editor** :

```sql
CREATE TABLE IF NOT EXISTS crypto_list (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  symbole TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crypto_prices (
  id BIGSERIAL PRIMARY KEY,
  crypto_id TEXT NOT NULL REFERENCES crypto_list(id),
  timestamp BIGINT NOT NULL,
  prix FLOAT8 NOT NULL,
  UNIQUE(crypto_id, timestamp)
);

ALTER TABLE crypto_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut lire crypto_list"
  ON crypto_list FOR SELECT USING (true);

CREATE POLICY "Tout le monde peut lire crypto_prices"
  ON crypto_prices FOR SELECT USING (true);
```

### Seed initial (remplir Supabase)

```bash
npm run seed
```

Récupère l'historique des 200 plus grosses cryptos : Binance (complet) + CoinGecko (365 jours) si absente de Binance.

## Développement

```bash
npm run dev
```

## Mise à jour automatique des données

Déployez et configurez un cron (cron-job.org, UptimeRobot) pour pinger quotidiennement :

```
https://votre-site.vercel.app/api/seed
```

Le seed est idempotent (upsert) → pas de doublons.

## Architecture

```
src/
├── app/
│   ├── api/seed/route.ts    # Route cron pour seed automatique
│   ├── globals.css           # Design system (@theme inline)
│   ├── layout.tsx            # Layout racine (header, footer, police Lexend)
│   └── page.tsx              # Page d'accueil
├── components/
│   ├── cryptoCalculs.ts      # Appels API + calculs DCA
│   ├── CryptoChart.tsx       # Graphique SVG pur
│   ├── CryptoForm.tsx        # Formulaire
│   ├── CryptoResultats.tsx   # Affichage résultats
│   └── CryptoSimulator.tsx   # Chef d'orchestre
└── lib/
    └── supabase.ts           # Client Supabase
```

## Partis pris techniques

- **SVG pur** pour le graphique : zéro dépendance, léger, intégrable sans conflit
- **Binance > CoinCap** : CoinCap était inaccessible depuis notre réseau, Binance API est fiable et gratuite
- **Cache à la volée** : les données CoinGecko sont stockées dans Supabase à chaque simulation → accumulation progressive
- **Pas de librairie UI** : Tailwind seul, pour rester cohérent avec simulateurs.sinvestir.fr

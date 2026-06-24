import CryptoSimulator from "@/components/CryptoSimulator";

export default function Home() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-8">Simulateur Crypto</h1>
        <CryptoSimulator />
      </div>
    </main>
  );
}

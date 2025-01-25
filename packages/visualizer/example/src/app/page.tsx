import { ClientOnly, Visualizer } from "./components";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start size-full">
        <h1 className="text-2xl font-bold">
          Drizzle Visualizer in a Next.js App
        </h1>
        <div className="w-full h-full">
          <ClientOnly fallback={<div>Loading...</div>}>
            <Visualizer />
          </ClientOnly>
        </div>
      </main>
    </div>
  );
}

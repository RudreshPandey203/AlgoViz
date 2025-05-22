import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const algorithms = [
    { name: "Bellman-Ford", href: "/bellman-ford" },
    { name: "Dijkstra's Algorithm", href: "#" },
    { name: "Floyd-Warshall", href: "/floyd-warshall" },
    { name: "A* Search", href: "#" },
    { name: "Kruskal's MST", href: "#" },
    { name: "Prim's MST", href: "#" },
    { name: "Topological Sort", href: "/topological-sort" },
    { name: "DFS & BFS", href: "#" },
    { name: "Tarjan's SCC", href: "#" },
  ];

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-black text-white">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-4xl">
        <div className="flex flex-col items-center sm:items-start gap-2">
          {/* <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={38}
            priority
          /> */}
          <h1 className="text-3xl sm:text-4xl font-semibold mt-4">
            Algorithm Visualizer
          </h1>
          <p className="text-lg text-gray-300">
            Click on an algorithm to visualize how it works.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {algorithms.map((algo) => (
            <Link
              key={algo.name}
              href={algo.href}
              className="rounded-xl border border-gray-700 hover:border-white hover:bg-gray-900 transition-all p-4 text-center text-white font-medium shadow-md hover:shadow-lg"
            >
              {algo.name}
            </Link>
          ))}
        </div>
      </main>

      <footer className="row-start-3 text-sm text-gray-500">
        Built with ❤️ by Rudresh
      </footer>
    </div>
  );
}

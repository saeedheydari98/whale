export default function Home() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-bg-base p-10 text-text-primary">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-ui-primary/30 bg-bg-surface p-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
        Building a Dynamic UI Playground
      </h1>

      <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-8">
        This project is an experimental space focused on designing and developing
        a scalable, dynamic UI infrastructure. It’s a place to explore ideas,
        refine patterns, and push the boundaries of modern frontend architecture.
      </p>

      <p className="text-base text-gray-500 max-w-xl mb-10">
        Contributions, ideas, and feedback are always welcome. If you're
        interested in UI systems, design architecture, or just enjoy building
        things — we'd love to have you involved.
      </p>

      <div className="flex gap-4">
        <a
          href="https://github.com/saeedheydari98/NEXT-UI"
          target="_blank"
          className="px-6 py-3 bg-black text-white rounded-2xl shadow hover:opacity-90 transition"
        >
          Contribute on GitHub
        </a>

        <a
          href="#"
          className="px-6 py-3 border rounded-2xl hover:bg-gray-100 transition"
        >
          Learn More
        </a>
      </div>
      </section>
    </main>
  );
}

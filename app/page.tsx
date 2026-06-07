export default function Home() {
  return (
    <main className=" bg-bg-base p-10 text-text-primary">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-ui-primary/30 bg-bg-surface p-8">
        <div className="mb-6 text-4xl font-bold md:text-5xl">
          Building a Dynamic UI Playground
        </div>

        <div className="mb-8 max-w-2xl text-lg text-gray-600 md:text-xl">
          This project is an experimental space focused on designing and developing
          a scalable, dynamic UI infrastructure. It’s a place to explore ideas,
          refine patterns, and push the boundaries of modern frontend architecture.
        </div>

        <div className="mb-10 max-w-xl text-base text-gray-500">
          Contributions, ideas, and feedback are always welcome. If you're
          interested in UI systems, design architecture, or just enjoy building
          things — we'd love to have you involved.
        </div>

        <div className="flex gap-4">
          <a
            href="https://github.com/saeedheydari98/NEXT-UI"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-black px-6 py-3 text-white shadow transition hover:opacity-90"
          >
            Contribute on GitHub
          </a>

          <a
            href="#"
            className="rounded-2xl border px-6 py-3 transition hover:bg-gray-100"
          >
            Learn More
          </a>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <main className=" bg-bg-base p-10 text-primary-text">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-primary-border bg-bg-surface p-8">
        <div className="mb-6 text-4xl font-bold md:text-5xl">
          Dynamic & Scalable E-Commerce Platform
        </div>

        <div className="mb-8 max-w-2xl text-lg text-primary-text md:text-xl">
          This project is an experimental space focused on designing and developing
          a dynamic, scalable e-commerce infrastructure. It's a place to explore ideas,
          refine patterns, and push the boundaries of modern online store architecture.
        </div>

        <div className="mb-10 max-w-xl text-base text-secondary-text">
          Contributions, ideas, and feedback are always welcome. If you're
          interested in e-commerce systems, design architecture, or just enjoy building
          digital products — we'd love to have you involved.
        </div>

        <div className="flex gap-4">
          <a
            href="https://github.com/saeedheydari98/NEXT-UI"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-primary px-6 py-3 text-primary-contrast shadow transition hover:opacity-90"
          >
            Contribute on GitHub
          </a>

          <a
            href="#"
            className="rounded-2xl border px-6 py-3 transition hover:bg-primary-bg"
          >
            Learn More
          </a>
        </div>
      </section>
    </main>
  );
}
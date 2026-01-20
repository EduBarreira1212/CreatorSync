export default function Home() {
  return (
    <main className="page-shell">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-4 animate-fade-up">
          <span className="pill w-fit">creator sync</span>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Ship content everywhere, on your schedule.
          </h1>
          <p className="text-base text-[color:var(--ink-soft)] md:text-lg">
            Connect your YouTube account, upload media, create posts, and track
            publishing status in one place.
          </p>
        </header>

        <section
          className="grid gap-4 md:grid-cols-3 animate-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          {[
            {
              title: 'Connections',
              description:
                'Link your YouTube channel and check token status at a glance.',
              href: '/settings/connections',
            },
            {
              title: 'Create',
              description:
                'Upload a video, draft captions, and prepare the publish job.',
              href: '/create',
            },
            {
              title: 'Track',
              description:
                'Follow publishing progress for each destination in real time.',
              href: '/posts',
            },
          ].map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="card flex flex-col gap-3 p-5 transition hover:-translate-y-1"
            >
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="text-sm text-[color:var(--ink-soft)]">
                {card.description}
              </p>
              <span className="text-sm font-semibold text-[color:var(--accent)]">
                Open
              </span>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}

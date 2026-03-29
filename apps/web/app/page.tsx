const cards = [
  { title: 'Bookings Today', value: '128' },
  { title: 'In Transit', value: '842' },
  { title: 'Delivered', value: '7,914' },
  { title: 'Failed Alerts', value: '3' }
];

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">JETON CARGO</p>
        <h1>Realtime Logistics Control Tower</h1>
        <p>
          Event-driven cargo operations across Bangladesh and Malaysia with automated routing, tracking,
          and customer communication.
        </p>
      </section>

      <section className="grid">
        {cards.map((card) => (
          <article key={card.title} className="card">
            <h2>{card.title}</h2>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}

import { bg } from '../../i18n/bg';

export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div className="page">
      <header className="page-head">
        <div className="page-title">
          <h1>{title}</h1>
        </div>
      </header>
      <section className="card">
        <h3>{bg.comingSoon}</h3>
        <p>{text}</p>
      </section>
    </div>
  );
}

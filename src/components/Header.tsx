import { Link } from "@tanstack/react-router";

export function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 flex items-center justify-between h-16">
        <Link to="/" className="group flex items-center gap-2">
          <span className="font-display text-xl tracking-wide text-primary">
            Fragrance <span className="italic text-rose">Finds</span> You
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-10 text-sm uppercase tracking-[0.18em] text-muted-foreground">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">Home</Link>
          <Link to="/catalog" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">Catalog</Link>
          <Link to="/about" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">About</Link>
          <Link to="/contact" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">Contact</Link>
        </nav>
        <a
          href="https://fragrancefindsyou.com/collections/all"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.18em] hover:bg-rose hover:text-primary-foreground transition-colors"
        >
          Shop
        </a>
      </div>
    </header>
  );
}

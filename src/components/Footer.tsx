import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-cream/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 grid gap-12 md:grid-cols-3">
        <div>
          <h3 className="font-display text-3xl text-primary">Fragrance Finds You</h3>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            A small independent decanting house by Joan — saving toward Paris, one scent at a time.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Explore</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalog" className="hover:text-rose">Shop all decants</Link></li>
            <li><Link to="/about" className="hover:text-rose">About</Link></li>
            <li><Link to="/contact" className="hover:text-rose">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Follow Joan</p>
          <ul className="space-y-2 text-sm">
            <li><a href="https://www.instagram.com/fragrancefindsyou" target="_blank" rel="noreferrer" className="hover:text-rose">Instagram</a></li>
            <li><a href="http://www.tiktok.com/@fragrancefindsyou" target="_blank" rel="noreferrer" className="hover:text-rose">TikTok</a></li>
            <li><a href="https://youtube.com/@fragrancefindsyou" target="_blank" rel="noreferrer" className="hover:text-rose">YouTube</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Contact</p>
          <ul className="space-y-2 text-sm">
            <li><a href="mailto:Fragrancefindsyouu@gmail.com" className="hover:text-rose">Fragrancefindsyouu@gmail.com</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © 2025 Fragrance Finds You · Independent decants. Not affiliated with any brand.
      </div>
    </footer>
  );
}

import { Link } from "@tanstack/react-router";
import { EditableText } from "@/lib/siteSettings";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-cream/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 grid gap-12 md:grid-cols-3">
        <div>
          <EditableText id="footer.brand" as="h3" className="font-display text-3xl text-primary">Fragrance Finds You</EditableText>
          <EditableText id="footer.tagline" as="p" className="mt-3 text-sm text-muted-foreground max-w-xs" multiline>
            A small independent decanting house by Joan — saving toward Paris, one scent at a time.
          </EditableText>
        </div>
        <div>
          <EditableText id="footer.explore.label" as="p" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Explore</EditableText>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalog" className="hover:text-rose"><EditableText id="footer.link.catalog">Shop all decants</EditableText></Link></li>
            <li><Link to="/about" className="hover:text-rose"><EditableText id="footer.link.about">About</EditableText></Link></li>
            <li><Link to="/contact" className="hover:text-rose"><EditableText id="footer.link.contact">Contact</EditableText></Link></li>
          </ul>
        </div>
        <div>
          <EditableText id="footer.follow.label" as="p" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Follow Joan</EditableText>
          <ul className="space-y-2 text-sm">
            <li><a href="https://www.instagram.com/fragrancefindsyou" target="_blank" rel="noreferrer" className="hover:text-rose"><EditableText id="footer.social.ig">Instagram</EditableText></a></li>
            <li><a href="http://www.tiktok.com/@fragrancefindsyou" target="_blank" rel="noreferrer" className="hover:text-rose"><EditableText id="footer.social.tt">TikTok</EditableText></a></li>
            <li><a href="https://youtube.com/@fragrancefindsyou" target="_blank" rel="noreferrer" className="hover:text-rose"><EditableText id="footer.social.yt">YouTube</EditableText></a></li>
          </ul>
        </div>
        <div>
          <EditableText id="footer.contact.label" as="p" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Contact</EditableText>
          <ul className="space-y-2 text-sm">
            <li><a href="mailto:Fragrancefindsyouu@gmail.com" className="hover:text-rose"><EditableText id="footer.contact.email">Fragrancefindsyouu@gmail.com</EditableText></a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <EditableText id="footer.copyright">© 2025 Fragrance Finds You · Independent decants. Not affiliated with any brand.</EditableText>
        <span className="mx-2 opacity-50">·</span>
        <Link to="/auth" className="hover:text-rose transition-colors opacity-70">Admin</Link>
      </div>
    </footer>
  );
}

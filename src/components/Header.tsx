import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { EditableText } from "@/lib/siteSettings";

export function Header() {
  const { count, openCart } = useCart();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 flex items-center justify-between h-16">
        <Link to="/" className="group flex items-center gap-2">
          <span className="font-display text-xl tracking-wide text-primary">
            <EditableText id="header.brand.1">Fragrance </EditableText>
            <EditableText id="header.brand.2" className="italic text-rose">Finds</EditableText>
            <EditableText id="header.brand.3"> You</EditableText>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-10 text-sm uppercase tracking-[0.18em] text-muted-foreground">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">
            <EditableText id="nav.home">Home</EditableText>
          </Link>
          <Link to="/catalog" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">
            <EditableText id="nav.catalog">Catalog</EditableText>
          </Link>
          <Link to="/about" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">
            <EditableText id="nav.about">About</EditableText>
          </Link>
          <Link to="/contact" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">
            <EditableText id="nav.contact">Contact</EditableText>
          </Link>
        </nav>
        <button
          type="button"
          onClick={openCart}
          aria-label={`Open cart${count > 0 ? `, ${count} items` : ""}`}
          className="relative inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.18em] hover:bg-rose transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">
            <EditableText id="header.cart.label">Cart</EditableText>
          </span>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose text-primary-foreground text-[10px] font-semibold grid place-items-center">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

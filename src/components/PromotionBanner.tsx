import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { activePromotionBannersQueryOptions } from "@/lib/promotions";

function isInternalHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

export function PromotionBanner() {
  const { data: banners = [] } = useQuery(activePromotionBannersQueryOptions);
  const banner = banners[0];
  if (!banner) return null;

  const style = {
    color: banner.styles.color || undefined,
    backgroundColor: banner.styles.backgroundColor || undefined,
    fontFamily: banner.styles.fontFamily || undefined,
    fontSize: banner.styles.fontSize ? `${banner.styles.fontSize}px` : undefined,
    textAlign: banner.styles.textAlign || "center",
  } as const;

  const cta = banner.cta_label.trim();
  const href = banner.cta_href.trim() || "/catalog";

  return (
    <section className="border-b border-border/60 bg-rose text-primary-foreground" style={style}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-6 py-3 text-sm md:flex-row lg:px-10">
        {banner.image_url && (
          <img
            src={banner.image_url}
            alt="Promotion"
            className="h-12 w-12 rounded-full object-cover ring-2 ring-background/40"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          {banner.title && <p className="font-display text-xl leading-tight">{banner.title}</p>}
          {banner.message && <p className="leading-relaxed opacity-90">{banner.message}</p>}
        </div>
        {cta &&
          (isInternalHref(href) ? (
            <Link
              to={href}
              className="shrink-0 rounded-full bg-background px-5 py-2 text-xs uppercase tracking-[0.2em] text-primary hover:bg-cream"
            >
              {cta}
            </Link>
          ) : (
            <a
              href={href}
              className="shrink-0 rounded-full bg-background px-5 py-2 text-xs uppercase tracking-[0.2em] text-primary hover:bg-cream"
            >
              {cta}
            </a>
          ))}
      </div>
    </section>
  );
}
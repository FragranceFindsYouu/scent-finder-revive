import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroGif from "@/assets/hero-water-bamboo.gif";
import eiffelVideo from "@/assets/eiffel-tower-night.mp4.asset.json";


import { productsQueryOptions } from "@/lib/products";
import { EditableProductGrid } from "@/components/EditableProductGrid";
import { useEditMode } from "@/lib/editMode";
import { EditableText } from "@/lib/siteSettings";
import { useLayoutSetting, useSectionEnabled } from "@/components/LayoutCustomizer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fragrance Finds You — Designer & niche fragrance decants" },
      { name: "description", content: "Independent fragrance decants by Joan. Try designer and niche scents in small sizes from $5." },
      { property: "og:title", content: "Fragrance Finds You" },
      { property: "og:description", content: "Try before you commit. Independent decants from Tom Ford, LV, D'annam, Parfums de Marly and more." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: products = [] } = useQuery(productsQueryOptions);
  const { editMode } = useEditMode();
  const featured = editMode ? products : products.slice(0, 8);
  const [subscribing, setSubscribing] = useState(false);

  const gridCols = useLayoutSetting("gridCols", "4");
  const gridClass =
    gridCols === "2"
      ? "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12"
      : gridCols === "3"
      ? "grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12"
      : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12";

  const showHero = useSectionEnabled("hero");
  const showMarquee = useSectionEnabled("marquee");
  const showFeatured = useSectionEnabled("featured");
  const showAbout = useSectionEnabled("about");
  const showHowItWorks = useSectionEnabled("howItWorks");
  const showNewsletter = useSectionEnabled("newsletter");

  async function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") || "").trim();

    setSubscribing(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    setSubscribing(false);

    if (error) {
      if (error.code === "23505") {
        toast.success("You're already subscribed — thank you!");
        form.reset();
        return;
      }
      toast.error("Something went wrong. Please try again.");
      return;
    }
    toast.success("You're on the list! Talk soon — Joan");
    form.reset();
  }

  return (
    <div className="text-foreground">
      {showHero && (
        <section className="relative overflow-hidden min-h-[70vh] md:min-h-[80vh]">
          <img
            src={heroGif}
            alt="Moving water and bamboo"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative mx-auto max-w-7xl px-6 lg:px-10 py-32 md:py-44">
            <EditableText id="home.hero.eyebrow" as="p" className="text-xs uppercase tracking-[0.3em] text-gold">
              An independent decanting house
            </EditableText>
            <h1 className="mt-6 font-display text-5xl md:text-7xl lg:text-8xl leading-[1.02] text-white text-balance max-w-4xl drop-shadow-lg whitespace-pre-line block">
              <EditableText id="home.hero.heading.pre" as="span">The right </EditableText>
              <EditableText id="home.hero.heading.brand" as="span" className="text-rose">Fragrance Finds You</EditableText>
              <EditableText id="home.hero.heading.post" as="span"> in Our Bottles</EditableText>
            </h1>
            <EditableText id="home.hero.subtext" as="p" className="mt-6 max-w-xl text-base md:text-lg text-white/90 drop-shadow" multiline>
              {"Try designer and niche fragrances in decants — handpoured by Joan, That's truly you before committing to a full bottle. Fragrance Finds You is not associated with the brands you see <3"}
            </EditableText>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/catalog"
                className="rounded-full bg-primary text-primary-foreground px-7 py-3.5 text-xs uppercase tracking-[0.22em] hover:bg-rose transition-colors"
              >
                <EditableText id="home.hero.cta1">Browse the catalog</EditableText>
              </Link>
              <Link
                to="/about"
                className="rounded-full border border-white/40 bg-white/10 backdrop-blur px-7 py-3.5 text-xs uppercase tracking-[0.22em] text-white hover:bg-white/20 transition-colors"
              >
                <EditableText id="home.hero.cta2">Joan's story</EditableText>
              </Link>
            </div>
          </div>
        </section>
      )}

      {showMarquee && (
        <section className="border-y border-border/60 bg-cream/50">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <EditableText id="home.marquee" multiline>
              Tom Ford · Louis Vuitton · Parfums de Marly · Maison Margiela · D'annam · Xerjoff · Initio · YSL
            </EditableText>
          </div>
        </section>
      )}

      {showFeatured && (
        <section className="mx-auto max-w-7xl px-6 lg:px-10 py-24">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
            <div>
              <EditableText id="home.featured.eyebrow" as="p" className="text-xs uppercase tracking-[0.25em] text-rose">
                MY STOCK
              </EditableText>
              <EditableText id="home.featured.heading" as="h2" className="mt-3 font-display text-4xl md:text-5xl text-primary block">
                Recently in my Collection
              </EditableText>
            </div>
            <Link to="/catalog" className="text-xs uppercase tracking-[0.25em] text-primary border-b border-rose pb-1 hover:text-rose">
              See all {products.length} scents →
            </Link>
          </div>
          <EditableProductGrid products={featured} gridClassName={gridClass} />
        </section>
      )}

      {showAbout && (
        <section className="relative bg-blush/30">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-24 grid md:grid-cols-2 gap-16 items-center">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-soft">
              <video
                src={eiffelVideo.url}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                onContextMenu={(e) => e.preventDefault()}
                onPause={(e) => { void (e.currentTarget as HTMLVideoElement).play(); }}
                className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
              />
            </div>
            <div>
              <EditableText id="home.about.eyebrow" as="p" className="text-xs uppercase tracking-[0.3em] text-bordeaux">
                A note from Joan
              </EditableText>
              <EditableText id="home.about.heading" as="h2" className="mt-4 font-display text-4xl md:text-5xl text-primary text-balance block">
                Saving for Paris, one decant at a time.
              </EditableText>
              <EditableText id="home.about.body" as="p" className="mt-6 text-foreground/80 leading-relaxed" multiline>
                Means a lot to me that you're checking out my shop. Fragrance Finds You is my own little decanting business — every order helps me save toward studying perfumery in Paris, so one day I can make my own fragrances. It's a dream of mine, and you're part of it.
              </EditableText>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/about" className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.22em] hover:bg-rose">
                  <EditableText id="home.about.cta1">Read more</EditableText>
                </Link>
                <Link to="/catalog" className="rounded-full border border-primary/30 px-6 py-3 text-xs uppercase tracking-[0.22em] text-primary hover:bg-cream">
                  <EditableText id="home.about.cta2">Support the journey</EditableText>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {showHowItWorks && (
        <section className="mx-auto max-w-7xl px-6 lg:px-10 py-24">
          <div className="text-center max-w-2xl mx-auto">
            <EditableText id="home.how.eyebrow" as="p" className="text-xs uppercase tracking-[0.25em] text-rose">How it works</EditableText>
            <EditableText id="home.how.heading" as="h2" className="mt-3 font-display text-4xl md:text-5xl text-primary block">Try before the full bottle</EditableText>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-10">
            {[
              { n: "01", tid: "home.how.step1.t", t: "Choose your scents", did: "home.how.step1.d", d: "Browse 65+ designer and niche fragrances — from cult classics to hidden gems." },
              { n: "02", tid: "home.how.step2.t", t: "Handpoured By Me", did: "home.how.step2.d", d: "Each decant is poured by Joan into a clean glass atomizer, sealed and labelled." },
              { n: "03", tid: "home.how.step3.t", t: "Delivered to your door", did: "home.how.step3.d", d: "Wear it Live with it  Then go find your signature Scent." },
            ].map((s) => (
              <div key={s.n} className="border-t border-border pt-6">
                <span className="font-display text-3xl text-rose">{s.n}</span>
                <EditableText id={s.tid} as="h3" className="mt-3 font-display text-2xl text-primary block">{s.t}</EditableText>
                <EditableText id={s.did} as="p" className="mt-2 text-sm text-muted-foreground leading-relaxed" multiline>{s.d}</EditableText>
              </div>
            ))}
          </div>
        </section>
      )}

      {showNewsletter && (
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-3xl px-6 lg:px-10 py-20 text-center">
            <EditableText id="home.news.eyebrow" as="p" className="text-xs uppercase tracking-[0.3em] text-rose">Help me on this journey</EditableText>
            <EditableText id="home.news.heading" as="h2" className="mt-4 font-display text-4xl md:text-5xl text-primary-foreground text-balance block">
              Subscribe for scents that inspire
            </EditableText>
            <EditableText id="home.news.subtext" as="p" className="mt-4 text-primary-foreground/70">New decants, restocks, and Occasional Promo Codes</EditableText>
            <form className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={handleSubscribe}>
              <input
                name="email"
                type="email"
                required
                placeholder="your@email.com"
                className="flex-1 rounded-full bg-background/10 border border-primary-foreground/20 px-5 py-3 text-sm placeholder:text-primary-foreground/50 focus:outline-none focus:border-rose"
              />
              <button disabled={subscribing} className="rounded-full bg-rose text-primary px-6 py-3 text-xs uppercase tracking-[0.22em] hover:bg-cream disabled:opacity-60">
                {subscribing ? "Signing up…" : "Sign up"}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}

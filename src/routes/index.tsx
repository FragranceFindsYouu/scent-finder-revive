import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroGif from "@/assets/hero-water-bamboo.gif";
import eiffelVideo from "@/assets/eiffel-tower-night.mp4.asset.json";
import aboutImg from "@/assets/about-decants.jpg";


import { productsQueryOptions } from "@/lib/products";
import { FragranceCard } from "@/components/FragranceCard";
import { EditableProductGrid } from "@/components/EditableProductGrid";
import { useEditMode } from "@/lib/editMode";

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
  const featured = products.slice(0, 8);
  const [subscribing, setSubscribing] = useState(false);

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
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[70vh] md:min-h-[80vh]">
        <img
          src={heroGif}
          alt="Moving water and bamboo"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10 py-32 md:py-44">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">An independent decanting house</p>
          <h1 className="mt-6 font-display text-5xl md:text-7xl lg:text-8xl leading-[1.02] text-white text-balance max-w-4xl drop-shadow-lg whitespace-pre-line">
            The right <span className="text-rose">Fragrance finds</span> you in Our{"\u00A0"}Bottles
          </h1>
          <p className="mt-6 max-w-xl text-base md:text-lg text-white/90 drop-shadow">
            Try designer and niche fragrances in decants — handpoured by Joan, That's truly you before committing to a full bottle. Fragrance Finds You is not associated{"\u00A0"} with the brands you see &lt;3
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/catalog"
              className="rounded-full bg-primary text-primary-foreground px-7 py-3.5 text-xs uppercase tracking-[0.22em] hover:bg-rose transition-colors"
            >
              Browse the catalog
            </Link>
            <Link
              to="/about"
              className="rounded-full border border-white/40 bg-white/10 backdrop-blur px-7 py-3.5 text-xs uppercase tracking-[0.22em] text-white hover:bg-white/20 transition-colors"
            >
              Joan's story
            </Link>
          </div>
        </div>
      </section>

      {/* Marquee strip */}
      <section className="border-y border-border/60 bg-cream/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <span>Tom Ford</span>·<span>Louis Vuitton</span>·<span>Parfums de Marly</span>·<span>Maison Margiela</span>·<span>D'annam</span>·<span>Xerjoff</span>·<span>Initio</span>·<span>YSL</span>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-24">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-rose">MY STOCK</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-primary">Recently in my Collection{"\u00A0"}</h2>
          </div>
          <Link to="/catalog" className="text-xs uppercase tracking-[0.25em] text-primary border-b border-rose pb-1 hover:text-rose">
            See all {products.length} scents →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {featured.map((f) => <FragranceCard key={f.id} f={f} />)}
        </div>
      </section>

      {/* About teaser */}
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
            <p className="text-xs uppercase tracking-[0.3em] text-bordeaux">A note from Joan</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl text-primary text-balance">
              Saving for Paris, <span className="italic text-rose">one decant at a time.</span>
            </h2>
            <p className="mt-6 text-foreground/80 leading-relaxed">
              Means a lot to me that you're checking out my shop. Fragrance Finds You is my own little decanting business — every order helps me save toward studying perfumery in Paris, so one day I can make my own fragrances. It's a dream of mine, and you're part of it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/about" className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.22em] hover:bg-rose">
                Read more
              </Link>
              <Link to="/catalog" className="rounded-full border border-primary/30 px-6 py-3 text-xs uppercase tracking-[0.22em] text-primary hover:bg-cream">
                Support the journey
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] text-rose">How it works</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl text-primary">Try before the full bottle</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-10">
          {[
            { n: "01", t: "Choose your scents", d: "Browse 65+ designer and niche fragrances — from cult classics to hidden gems." },
            { n: "02", t: "Handpoured By Me", d: "Each decant is poured by Joan into a clean glass atomizer, sealed and labelled." },
            { n: "03", t: "Delivered to your door", d: "Wear it Live with it \u00A0Then go find your signature Scent." },
          ].map((s) => (
            <div key={s.n} className="border-t border-border pt-6">
              <span className="font-display text-3xl text-rose">{s.n}</span>
              <h3 className="mt-3 font-display text-2xl text-primary">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 lg:px-10 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-rose">Help me on this journey</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl text-primary-foreground text-balance">
            Subscribe for scents that inspire
          </h2>
          <p className="mt-4 text-primary-foreground/70">New decants, restocks, and Occasional Promo Codes</p>
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
    </div>
  );
}

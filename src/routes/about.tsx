import { createFileRoute } from "@tanstack/react-router";
import parisGif from "@/assets/paris.gif.asset.json";
import { EditableText } from "@/lib/siteSettings";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Joan — Fragrance Finds You" },
      { name: "description", content: "Meet Joan, founder of Fragrance Finds You. An independent decanting house saving toward studying perfumery in Paris." },
      { property: "og:title", content: "About Joan — Fragrance Finds You" },
      { property: "og:description", content: "An independent decanting house saving toward Paris." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 lg:px-10 pt-24 pb-12 text-center">
        <EditableText id="about.eyebrow" as="p" className="text-xs uppercase tracking-[0.3em] text-rose">A note from the founder</EditableText>
        <h1 className="mt-6 font-display text-5xl md:text-7xl text-primary text-balance leading-[1.05]">
          <EditableText id="about.hero.pre">Hello, I'm </EditableText>
          <EditableText id="about.hero.name" className="italic text-rose">Joan.</EditableText>
        </h1>
        <EditableText id="about.intro" as="p" className="mt-8 text-lg text-foreground/80 max-w-2xl mx-auto leading-relaxed" multiline>
          Means a lot to me that you're here. Fragrance Finds You is my own little decanting business — a way to share the scents I love and slowly save toward a dream of mine.
        </EditableText>
      </section>

      <section className="mx-auto max-w-6xl px-6 lg:px-10 grid md:grid-cols-2 gap-14 items-center pb-24">
        <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-soft">
          <img src={parisGif.url} alt="A pink rose in front of the Eiffel Tower at sunset" className="h-full w-full object-cover" />
        </div>
        <div className="space-y-6 font-serif text-lg leading-relaxed text-foreground/85">
          <EditableText id="about.quote" as="p" className="font-display text-3xl text-primary italic">"One day, my own bottle."</EditableText>
          <EditableText id="about.body.1" as="p" multiline>
            Every decant I pour goes into a small fund: tuition for perfumery school in Paris. I want to learn how scent is composed — how a single note becomes a story — and eventually create fragrances of my own.
          </EditableText>
          <EditableText id="about.body.2" as="p" multiline>
            Until then, I want you to be able to try the world's most beautiful fragrances without committing to a $300 bottle. Decanting is how scent should be discovered: slowly, intimately, in a little glass vial that lives in your bag for a week.
          </EditableText>
          <EditableText id="about.body.3" as="p">Thank you for being part of this. Truly.</EditableText>
          <EditableText id="about.signoff" as="p" className="font-display text-2xl text-rose pt-2">— Joan</EditableText>
        </div>
      </section>

      <section className="bg-blush/30 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <EditableText id="about.disclaimer.label" as="p" className="text-xs uppercase tracking-[0.3em] text-bordeaux">A small disclaimer</EditableText>
          <EditableText id="about.disclaimer.body" as="p" className="mt-4 text-sm text-muted-foreground leading-relaxed" multiline>
            Fragrance Finds You is an independent retailer offering genuine fragrance decants and samples. We are not affiliated with or endorsed by the original brands. All trademarks are property of their respective owners.
          </EditableText>
        </div>
      </section>
    </div>
  );
}

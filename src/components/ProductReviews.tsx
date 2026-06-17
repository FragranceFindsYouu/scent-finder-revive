import { useQuery } from "@tanstack/react-query";
import { getProductReviews, type ReviewRow } from "@/lib/reviews.functions";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-rose" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "" : "text-muted-foreground/30"}>
          ★
        </span>
      ))}
    </div>
  );
}

export function ProductReviews({ handle }: { handle: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["product-reviews", handle],
    queryFn: () => getProductReviews({ data: { handle } }),
  });

  const reviews: ReviewRow[] = data ?? [];
  const average =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  return (
    <section className="mt-20 border-t border-border pt-12">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-rose">Verified Customer Reviews</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl text-primary">
            What customers are saying
          </h2>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3">
            <Stars value={Math.round(average)} />
            <span className="text-sm text-muted-foreground">
              {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/50 p-10 text-center">
            <p className="font-display text-2xl text-primary">Be the first to review this fragrance!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Verified reviews appear here after customers purchase and share their experience.
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-white p-6">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} />
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Verified
                  </span>
                </div>
                {r.review_text && (
                  <p className="mt-4 text-sm text-foreground/85 leading-relaxed">
                    {r.review_text}
                  </p>
                )}
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  — {r.customer_name} ·{" "}
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

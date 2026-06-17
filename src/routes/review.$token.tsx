import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrderByToken, submitReview } from "@/lib/reviews.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/review/$token")({
  head: () => ({
    meta: [
      { title: "Leave a review — Fragrance Finds You" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReviewPage,
});

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-3xl leading-none transition-colors ${
            n <= value ? "text-rose" : "text-muted-foreground/30"
          }`}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewPage() {
  const { token } = Route.useParams();
  const router = useRouter();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["order-by-token", token],
    queryFn: () => getOrderByToken({ data: { token } }),
  });

  const [selectedHandle, setSelectedHandle] = useState<string>("");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <div className="mx-auto max-w-xl px-6 py-24 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl text-primary">Review link not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This review link is invalid or has expired.
        </p>
        <Link to="/catalog" className="mt-8 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
          Browse catalog
        </Link>
      </div>
    );
  }

  const remainingItems = order.items.filter(
    (i) => i.handle && !order.already_reviewed_handles.includes(i.handle),
  );

  if (remainingItems.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl text-primary">Thank you</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You've already reviewed every fragrance in this order.
        </p>
        <Link to="/catalog" className="mt-8 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
          Browse catalog
        </Link>
      </div>
    );
  }

  const activeHandle = selectedHandle || remainingItems[0].handle;
  const activeItem = remainingItems.find((i) => i.handle === activeHandle)!;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please add your name.");
      return;
    }
    setSubmitting(true);
    const res = await submitReview({
      data: {
        token,
        product_handle: activeHandle,
        customer_name: name.trim(),
        rating,
        review_text: text.trim(),
      },
    });
    setSubmitting(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Review submitted — thank you!");
    setText("");
    setRating(5);
    setSelectedHandle("");
    await refetch();
    router.invalidate();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-primary text-center">Leave a review</h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Verified review for your recent order
      </p>

      {remainingItems.length > 1 && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Which fragrance?
          </p>
          <div className="flex flex-wrap gap-2">
            {remainingItems.map((i) => {
              const active = i.handle === activeHandle;
              return (
                <button
                  key={i.handle + i.size}
                  type="button"
                  onClick={() => setSelectedHandle(i.handle)}
                  className={`rounded-full px-4 py-2 text-sm border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-rose"
                  }`}
                >
                  {i.title} · {i.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-10 space-y-6 rounded-2xl border border-border bg-white p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reviewing</p>
          <p className="mt-1 font-display text-2xl text-primary">{activeItem.title}</p>
          <p className="text-sm text-muted-foreground">{activeItem.size}</p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your rating</label>
          <div className="mt-2"><Stars value={rating} onChange={setRating} /></div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground" htmlFor="name">Your name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="First name or initials"
            required
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground" htmlFor="text">Your review</label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={5}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="How does it wear? When do you reach for it?"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3.5 text-xs uppercase tracking-[0.22em] hover:bg-rose disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </div>
  );
}

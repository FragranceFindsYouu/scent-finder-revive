import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { getReviewTokenForSession } from "@/lib/reviews.functions";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Order confirmed — Fragrance Finds You" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const { clear } = useCart();

  useEffect(() => {
    if (session_id) clear();
  }, [session_id, clear]);

  // Poll briefly because the webhook may land a beat after the redirect.
  const { data } = useQuery({
    queryKey: ["review-token", session_id],
    enabled: !!session_id,
    queryFn: () => getReviewTokenForSession({ data: { sessionId: session_id! } }),
    refetchInterval: (q) => (q.state.data?.token ? false : 2000),
  });

  const token = data?.token ?? null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-4xl md:text-5xl text-primary">Thank you</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {session_id
          ? "Your order is confirmed. A receipt has been sent to your email."
          : "We couldn't find your session, but if you completed payment your order is safe."}
      </p>

      {token && (
        <div className="mt-10 rounded-2xl border border-rose/30 bg-white/60 p-8">
          <p className="font-display text-2xl text-primary">Loved your fragrance?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Share a verified review for the sizes you purchased.
          </p>
          <Link
            to="/review/$token"
            params={{ token }}
            className="mt-6 inline-flex rounded-full bg-rose text-white px-6 py-3 text-xs uppercase tracking-[0.2em] hover:opacity-90"
          >
            Leave a review
          </Link>
        </div>
      )}

      <Link
        to="/catalog"
        className="mt-10 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
      >
        Continue shopping
      </Link>
    </div>
  );
}

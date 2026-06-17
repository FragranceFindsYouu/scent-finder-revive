import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";

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

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-4xl md:text-5xl text-primary">Thank you</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {session_id
          ? "Your order is confirmed. A receipt has been sent to your email."
          : "We couldn't find your session, but if you completed payment your order is safe."}
      </p>
      <Link
        to="/catalog"
        className="mt-10 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
      >
        Continue shopping
      </Link>
    </div>
  );
}

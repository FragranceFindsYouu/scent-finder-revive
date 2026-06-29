import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useMemo, useState } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCartCheckoutSession } from "@/lib/checkout.functions";
import type { CartItem } from "@/lib/cart";

export function StripeCartCheckout({
  items,
  customerEmail,
  returnUrl,
}: {
  items: CartItem[];
  customerEmail?: string;
  returnUrl: string;
}) {
  const stripePromise = useMemo(() => getStripe(), []);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    try {
      const result = await createCartCheckoutSession({
        data: {
          environment: getStripeEnvironment(),
          returnUrl,
          customerEmail,
          items: items.map((i) => ({
            productId: i.product_id,
            variantId: i.variant_id,
            title: i.title,
            size: i.size,
            handle: i.handle,
            image: i.image,
            unitAmount: Math.round(i.price * 100),
            quantity: i.quantity,
          })),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
      setErrorMsg(null);
      return result.clientSecret;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      setErrorMsg(msg);
      throw err;
    }
  }, [items, customerEmail, returnUrl]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  if (errorMsg) {
    return (
      <div className="p-6 text-center">
        <p className="font-medium text-red-700">Checkout couldn't start</p>
        <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
        <button
          onClick={() => setErrorMsg(null)}
          className="mt-4 inline-flex rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.2em]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useMemo } from "react";
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

  const fetchClientSecret = useCallback(async () => {
    const result = await createCartCheckoutSession({
      data: {
        environment: getStripeEnvironment(),
        returnUrl,
        customerEmail,
        items: items.map((i) => ({
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
    return result.clientSecret;
  }, [items, customerEmail, returnUrl]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

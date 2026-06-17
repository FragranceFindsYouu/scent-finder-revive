import { createServerFn } from "@tanstack/react-start";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type LineItemInput = {
  title: string;
  size: string;
  image?: string;
  unitAmount: number; // cents
  quantity: number;
};

type CheckoutSessionResult = { clientSecret: string } | { error: string };

export const createCartCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      items: LineItemInput[];
      returnUrl: string;
      customerEmail?: string;
      environment: StripeEnv;
    }) => {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("Cart is empty");
      }
      for (const item of data.items) {
        if (
          !item.title ||
          !Number.isInteger(item.unitAmount) ||
          item.unitAmount < 50 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 99
        ) {
          throw new Error("Invalid cart item");
        }
      }
      return data;
    },
  )
  .handler(async ({ data }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items: data.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.unitAmount,
            product_data: {
              name: `${item.title} — ${item.size}`,
              ...(item.image && /^https?:\/\//.test(item.image) && {
                images: [item.image],
              }),
              tax_code: "txcd_99999999", // general tangible goods
            },
          },
        })),
        automatic_tax: { enabled: true },
        billing_address_collection: "auto",
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE", "NO", "DK", "IE"],
        },
        phone_number_collection: { enabled: true },
        ...(data.customerEmail && { customer_email: data.customerEmail }),
        payment_intent_data: {
          description: `Fragrance Finds You — ${data.items.length} item${data.items.length === 1 ? "" : "s"}`,
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

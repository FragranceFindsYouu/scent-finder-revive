import { createFileRoute, redirect } from "@tanstack/react-router";

// Old Shopify URLs like /collections/all or /collections/decants
// All map to the unified /catalog page.
export const Route = createFileRoute("/collections/$")({
  beforeLoad: () => {
    throw redirect({ to: "/catalog" });
  },
});

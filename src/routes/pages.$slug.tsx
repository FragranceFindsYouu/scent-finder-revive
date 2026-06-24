import { createFileRoute, redirect } from "@tanstack/react-router";

// Old Shopify URLs like /pages/about, /pages/contact, /pages/anything-else.
export const Route = createFileRoute("/pages/$slug")({
  beforeLoad: ({ params }) => {
    const slug = params.slug.toLowerCase();
    if (slug === "about") throw redirect({ to: "/about" });
    if (slug === "contact") throw redirect({ to: "/contact" });
    throw redirect({ to: "/" });
  },
});

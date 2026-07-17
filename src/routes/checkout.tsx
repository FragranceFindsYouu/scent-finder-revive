import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout")({
  component: CheckoutLayout,
});

function CheckoutLayout() {
  return <Outlet />;
}
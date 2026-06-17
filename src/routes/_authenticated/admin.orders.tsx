import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listOrdersAdmin,
  refundOrderAdmin,
  type AdminOrder,
} from "@/lib/admin-orders.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useIsAdmin } from "@/lib/useIsAdmin";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOrdersPage,
});

function money(cents: number | null) {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    refunded: "bg-amber-100 text-amber-800",
    cancelled: "bg-zinc-200 text-zinc-700",
    oversold: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status] ?? "bg-zinc-100 text-zinc-700"}`}>
      {status}
    </span>
  );
}

function AdminOrdersPage() {
  const { isAdmin, ready } = useIsAdmin();
  const listFn = useServerFn(listOrdersAdmin);
  const refundFn = useServerFn(refundOrderAdmin);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => listFn(),
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [refunding, setRefunding] = useState(false);

  if (!ready) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl text-primary">Admins only</h1>
        <p className="mt-3 text-sm text-muted-foreground">You don't have access to this page.</p>
        <Link to="/" className="mt-6 inline-flex text-sm underline">Back to home</Link>
      </div>
    );
  }

  const handleRefund = async () => {
    if (!selected) return;
    setRefunding(true);
    try {
      const result = await refundFn({
        data: { orderId: selected.id, environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
      toast.success("Refund issued and inventory restocked.");
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setConfirmRefund(false);
      setSelected(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-10 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-primary">Orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every paid order, newest first. Click a row to view details or issue a refund.
          </p>
        </div>
        <Link to="/_authenticated/admin-dashboard" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading orders…</td>
              </tr>
            )}
            {!isLoading && (orders?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No orders yet. They'll appear here the moment a customer checks out.
                </td>
              </tr>
            )}
            {orders?.map((o) => {
              const totalQty = o.items.reduce((s, i) => s + (i.quantity || 0), 0);
              return (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer border-t border-border hover:bg-muted/20"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(o.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{o.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {totalQty} item{totalQty === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-rose font-medium">{money(o.total_amount_cents)}</td>
                  <td className="px-4 py-3">{statusPill(o.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl text-primary">
                  Order {selected.id.slice(0, 8)}
                </SheetTitle>
                <SheetDescription>
                  {new Date(selected.created_at).toLocaleString()} · {statusPill(selected.status)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5 text-sm">
                <section>
                  <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Customer</h3>
                  <p className="mt-1 font-medium">{selected.customer_name ?? "—"}</p>
                  <p className="text-muted-foreground">{selected.customer_email ?? "—"}</p>
                </section>

                {selected.shipping_address && (
                  <section>
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Shipping</h3>
                    <pre className="mt-1 whitespace-pre-wrap text-xs text-foreground/80">
                      {Object.entries(selected.shipping_address)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("\n")}
                    </pre>
                  </section>
                )}

                <section>
                  <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Items</h3>
                  <ul className="mt-2 divide-y divide-border">
                    {selected.items.map((i, idx) => (
                      <li key={idx} className="py-2 flex justify-between gap-3">
                        <span className="flex-1">
                          <span className="font-medium">{i.title}</span>
                          <span className="text-muted-foreground"> — {i.size}</span>
                        </span>
                        <span className="text-muted-foreground">× {i.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex justify-between border-t border-border pt-3 font-medium">
                    <span>Total</span>
                    <span className="text-rose">{money(selected.total_amount_cents)}</span>
                  </div>
                </section>

                {selected.status === "paid" && (
                  <button
                    onClick={() => setConfirmRefund(true)}
                    className="w-full rounded-full bg-bordeaux text-white px-6 py-3 text-xs uppercase tracking-[0.2em] hover:opacity-90"
                  >
                    Cancel & refund order
                  </button>
                )}
                {(selected.status === "refunded" || selected.status === "cancelled") && (
                  <p className="text-xs text-muted-foreground">
                    Refunded on{" "}
                    {selected.refunded_at
                      ? new Date(selected.refunded_at).toLocaleString()
                      : "—"}
                    . Inventory has been restocked.
                  </p>
                )}
                {selected.status === "oversold" && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                    Stock ran out before this order could be reserved. Contact the customer to confirm fulfillment or refund.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmRefund} onOpenChange={setConfirmRefund}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This issues a full refund through Stripe and adds the purchased
              quantities back to inventory. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refunding}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              disabled={refunding}
              onClick={(e) => {
                e.preventDefault();
                handleRefund();
              }}
              className="bg-bordeaux text-white hover:opacity-90"
            >
              {refunding ? "Refunding…" : "Refund & restock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

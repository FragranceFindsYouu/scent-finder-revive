import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { shippingSettingsQueryOptions } from "@/lib/shipping";

export function ShippingNotice({
  subtotalCents,
  compact = false,
}: {
  subtotalCents?: number;
  compact?: boolean;
}) {
  const { data } = useQuery(shippingSettingsQueryOptions);
  if (!data) return null;

  const free = data.free_shipping_threshold_cents;
  const flat = data.flat_rate_cents;
  const manualTax = data.tax_mode === "manual" ? data.manual_tax_percent : 0;
  const showTax = data.show_tax_in_notice && manualTax > 0;
  const qualifies = subtotalCents !== undefined && subtotalCents >= free;
  const remaining = subtotalCents !== undefined ? Math.max(0, free - subtotalCents) : null;

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2 text-xs text-muted-foreground"
          : "flex items-start gap-3 rounded-lg border border-border bg-card/60 p-3 text-sm"
      }
    >
      <Truck className="h-4 w-4 shrink-0 text-rose" />
      <div className="leading-snug">
        {qualifies ? (
          <span className="text-rose font-medium">Free shipping unlocked!</span>
        ) : remaining !== null && remaining > 0 ? (
          <span>
            Add <span className="text-rose font-medium">${(remaining / 100).toFixed(2)}</span> more for{" "}
            <span className="font-medium">FREE shipping</span>
          </span>
        ) : (
          <span>
            <span className="font-medium">Free shipping</span> on orders over ${(free / 100).toFixed(2)}
          </span>
        )}
        <span className="text-muted-foreground">
          {" "}
          · Flat ${(flat / 100).toFixed(2)} otherwise · {data.delivery_min_days}–
          {data.delivery_max_days} business days
          {manualTax > 0 && <> · Tax {manualTax.toFixed(2).replace(/\.00$/, "")}%</>}
        </span>
      </div>
    </div>
  );
}

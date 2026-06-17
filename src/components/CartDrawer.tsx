import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, setQuantity, subtotal, count } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? null : closeCart())}>
      <SheetContent side="right" className="flex w-full sm:max-w-md flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl text-primary">
            Your cart {count > 0 && <span className="text-rose">({count})</span>}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center px-6">
            <div>
              <p className="font-display text-xl text-primary">Your cart is empty</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse the catalog and add a decant to get started.
              </p>
              <Link
                to="/catalog"
                onClick={closeCart}
                className="mt-6 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
              >
                Browse catalog
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6 divide-y divide-border">
              {items.map((item) => (
                <div key={item.variant_id} className="py-4 flex gap-4">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded bg-white">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <Link
                        to="/products/$handle"
                        params={{ handle: item.handle }}
                        onClick={closeCart}
                        className="font-medium text-sm text-foreground hover:text-rose truncate"
                      >
                        {item.title}
                      </Link>
                      <span className="text-sm text-rose whitespace-nowrap">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Size: {item.size} · ${item.price.toFixed(2)} each
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center border border-border rounded-full">
                        <button
                          onClick={() => setQuantity(item.variant_id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="px-3 py-1 text-muted-foreground hover:text-primary"
                        >
                          −
                        </button>
                        <span className="px-3 text-sm min-w-[1.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(item.variant_id, item.quantity + 1)}
                          disabled={item.quantity >= item.max_stock}
                          aria-label="Increase quantity"
                          className="px-3 py-1 text-muted-foreground hover:text-primary disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.variant_id)}
                        className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Subtotal
                </span>
                <span className="font-display text-2xl text-primary">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Shipping and taxes calculated at checkout.
              </p>
              <Link
                to="/checkout"
                onClick={closeCart}
                className="block text-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

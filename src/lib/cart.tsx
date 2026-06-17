import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  product_id: string;
  variant_id: string;
  title: string;
  handle: string;
  size: string;
  price: number;
  image: string;
  quantity: number;
  max_stock: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (variant_id: string) => void;
  setQuantity: (variant_id: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ffy.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.variant_id === item.variant_id);
        if (existing) {
          const nextQty = Math.min(existing.quantity + qty, item.max_stock || 99);
          return prev.map((i) =>
            i.variant_id === item.variant_id ? { ...i, quantity: nextQty } : i
          );
        }
        return [...prev, { ...item, quantity: Math.min(qty, item.max_stock || 99) }];
      });
      setIsOpen(true);
    },
    []
  );

  const removeItem = useCallback((variant_id: string) => {
    setItems((prev) => prev.filter((i) => i.variant_id !== variant_id));
  }, []);

  const setQuantity = useCallback((variant_id: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.variant_id === variant_id
            ? { ...i, quantity: Math.max(1, Math.min(qty, i.max_stock || 99)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQuantity,
      clear,
    }),
    [items, isOpen, addItem, removeItem, setQuantity, clear, openCart, closeCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

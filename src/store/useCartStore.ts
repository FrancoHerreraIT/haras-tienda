import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Producto tal como viaja al carrito.
 *
 * Es un subconjunto de lo que devuelve la base (ver StoreProduct): al carrito
 * solo le interesa que mostrar y cuanto cobrar. `stock` viaja para poder
 * limitar la cantidad sin volver a consultar el servidor.
 */
export interface Product {
  id: string;
  title: string;
  price: number;
  /** Solo la portada: al carrito no le hace falta la galeria entera. */
  imageUrl: string | null;
  categoryName: string;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  /** Vacia el carrito (y su copia en localStorage). */
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

/** Nunca se puede llevar mas de lo que hay en deposito. */
const clampToStock = (quantity: number, stock: number) =>
  Math.max(1, Math.min(quantity, stock));

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addToCart: (product) =>
        set((state) => {
          if (product.stock <= 0) return state;

          const existing = state.items.find((item) => item.id === product.id);

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? {
                      ...item,
                      /* Los datos del producto se refrescan: si cambio el
                         precio o la foto en el panel, el carrito lo toma. */
                      ...product,
                      quantity: clampToStock(item.quantity + 1, product.stock),
                    }
                  : item,
              ),
              isCartOpen: true,
            };
          }

          return {
            items: [...state.items, { ...product, quantity: 1 }],
            isCartOpen: true,
          };
        }),

      removeFromCart: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((item) => item.id !== productId) };
          }

          return {
            items: state.items.map((item) =>
              item.id === productId
                ? { ...item, quantity: clampToStock(quantity, item.stock) }
                : item,
            ),
          };
        }),

      /* Lo llama /checkout/success cuando el pago volvio aprobado: hasta ese
         momento el carrito se conserva, asi el que abandona el pago lo
         encuentra intacto al volver. */
      clearCart: () => set({ items: [] }),

      getTotalPrice: () =>
        get().items.reduce((total, item) => total + item.price * item.quantity, 0),

      getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),
    }),
    {
      name: "haras-cart-storage",
      partialize: (state) => ({ items: state.items }),
      /* v1 guardaba productos de demo (brand/image, ids inventados) que ya no
         existen en la base. Al subir de version se descarta ese carrito en vez
         de arrastrar items que el checkout no podria resolver. */
      version: 2,
      migrate: () => ({ items: [] }),
    },
  ),
);

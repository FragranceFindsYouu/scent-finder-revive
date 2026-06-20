import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { AmbientAudio } from "../components/AmbientAudio";
import { Toaster } from "../components/ui/sonner";
import { CartProvider } from "../lib/cart";
import { CartDrawer } from "../components/CartDrawer";
import { EditModeProvider, EditModeFloatingToggle } from "../lib/editMode";
import { SiteSettingsProvider } from "../lib/siteSettings";
import { LayoutCustomizer, ApplyBgTheme } from "../components/LayoutCustomizer";
import { SprayIntro } from "../components/SprayIntro";
import { CustomerChatBubble } from "../components/CustomerChatBubble";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 font-display text-2xl text-foreground">This scent has drifted away</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-primary-foreground hover:bg-rose">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-primary-foreground hover:bg-rose"
          >Try again</button>
          <a href="/" className="rounded-full border border-border bg-background px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Fragrance Finds You — Genuine designer & niche fragrance decants" },
      { name: "description", content: "Independent fragrance decants and samples by Joan. Try designer and niche scents in 5ml & 10ml — from Tom Ford and Louis Vuitton to D'annam and Parfums de Marly." },
      { property: "og:title", content: "Fragrance Finds You — Genuine designer & niche fragrance decants" },
      { property: "og:description", content: "Independent fragrance decants and samples by Joan. Try designer and niche scents in 5ml & 10ml — from Tom Ford and Louis Vuitton to D'annam and Parfums de Marly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Fragrance Finds You — Genuine designer & niche fragrance decants" },
      { name: "twitter:description", content: "Independent fragrance decants and samples by Joan. Try designer and niche scents in 5ml & 10ml — from Tom Ford and Louis Vuitton to D'annam and Parfums de Marly." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/35d154a1-9de7-40b4-87e1-6c6e08c7c9bf/id-preview-34378e3e--56e4f9a0-d571-4a58-b012-4adf54d8b1c1.lovable.app-1781681002608.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/35d154a1-9de7-40b4-87e1-6c6e08c7c9bf/id-preview-34378e3e--56e4f9a0-d571-4a58-b012-4adf54d8b1c1.lovable.app-1781681002608.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Lora:wght@400;500;600&family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Merriweather:wght@300;400;700&family=Bebas+Neue&family=Oswald:wght@300;400;500;600&family=Raleway:wght@300;400;500;600&family=DM+Serif+Display&family=Space+Grotesk:wght@300;400;500;600&family=Dancing+Script:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <SiteSettingsProvider>
          <EditModeProvider>
            <ApplyBgTheme />
            <SprayIntro />
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                <Outlet />
              </main>
              <Footer />
            </div>
            <CartDrawer />
            <AmbientAudio />
            <Toaster />
            <EditModeFloatingToggle />
            <LayoutCustomizer />
            <CustomerChatBubble />
          </EditModeProvider>
        </SiteSettingsProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

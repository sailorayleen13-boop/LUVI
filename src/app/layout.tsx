import type { Metadata, Viewport } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BottomNav } from "@/components/marketplace/bottom-nav";
import { DesktopNav } from "@/components/marketplace/desktop-nav";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUVI — Lo compré. Lo amé.",
  description:
    "Descubrí productos virales de tiendas locales cerca de vos: squishies, mascotas, belleza y más. LUVI IT!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fff8f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${jakarta.variable} h-full`}
    >
      <body className="min-h-full bg-charcoal font-sans antialiased">
        <Providers>
          {/*
            Mobile stays the original phone-card silhouette (max-w-[480px]
            centered on the dark backdrop). Tablet (md) widens that same
            card treatment instead of stretching it. Desktop (lg+) drops the
            phone-card metaphor entirely — full-bleed cream background with
            DesktopNav as a real site header and content centered in a
            max-width container below, rather than a giant floating phone.
          */}
          <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-cream shadow-[0_0_60px_rgba(0,0,0,0.15)] md:max-w-[720px] md:shadow-[0_0_50px_rgba(0,0,0,0.12)] lg:max-w-none lg:shadow-none">
            <DesktopNav />
            <div className="flex-1 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-8">{children}</div>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}

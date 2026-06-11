import type { Metadata } from "next";
import { Cinzel, Fredoka, Mulish } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { DiscoveryProvider } from "@/hooks/useDiscovery";
import { ToastProvider } from "@/hooks/useToast";
import AppShell from "@/components/shell/AppShell";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Force — Mundos vivos",
  description: "Un universo coleccionable de criaturas reales, mundos vivos y reliquias.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${cinzel.variable} ${fredoka.variable} ${mulish.variable}`}>
        <AuthProvider>
          <ToastProvider>
            <DiscoveryProvider>
              <AppShell>{children}</AppShell>
            </DiscoveryProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

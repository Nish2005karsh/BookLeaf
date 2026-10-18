import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const lato = Lato({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookLeaf Publishing - Author Support & Communication Portal",
  description: "BookLeaf Author & Admin Support Communication Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased font-sans`}>
      <body className="min-h-full flex flex-col bg-[#FFF5F6] text-[#556070]">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

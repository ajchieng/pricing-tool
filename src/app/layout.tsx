import type { Metadata } from "next";
import { Suspense } from "react";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { DemoProvider } from "@/components/demo/DemoProvider";
import { DemoShell } from "@/components/demo/DemoShell";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});
const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});
export const metadata: Metadata = {
  title: { default: "Pricing Tool", template: "%s · Pricing Tool" },
  description:
    "An interactive lending pricing portfolio: three calculation engines, transparent financial results, and a browser-local quote workspace using fictional data.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${sans.variable} ${serif.variable}`}
    >
      <body className="min-h-full">
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        <DemoProvider>
          <DemoShell>{children}</DemoShell>
        </DemoProvider>
      </body>
    </html>
  );
}

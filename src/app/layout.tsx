import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${APP_NAME} | Intelligent Civic Problem Resolution`,
  description: "Report civic issues, track progress and help build better communities through intelligent civic issue management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

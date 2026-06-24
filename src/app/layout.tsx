import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Registrar — Stock & Warehouse Management",
  description:
    "Simple stock and warehouse management for Nigerian retailers and distributors",
  applicationName: "Registrar",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Registrar",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#6C5CE7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("registrar_dark_mode")==="true")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

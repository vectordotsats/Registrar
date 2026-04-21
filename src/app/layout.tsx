import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registrar — Business Management",
  description:
    "Simple business management for Nigerian retailers and distributors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}

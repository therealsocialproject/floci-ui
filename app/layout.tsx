import type { Metadata } from "next";
import "./globals.css";
import { EndpointProvider } from "@/components/EndpointProvider";
import { Sidebar, Header } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Floci Console | Cloud Emulator Dashboard",
  description: "Management Console for Floci Local Cloud Emulator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-[#090d16] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
        <EndpointProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 p-8 overflow-y-auto">{children}</main>
          </div>
        </EndpointProvider>
      </body>
    </html>
  );
}

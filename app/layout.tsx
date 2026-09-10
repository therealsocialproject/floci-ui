import type { Metadata } from "next";
import "./globals.css";
import { EndpointProvider } from "@/components/EndpointProvider";
import { CloudThemeProvider } from "@/components/CloudThemeContext";
import { Sidebar, Header } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Floci Console | Cloud Emulator Dashboard",
  description:
    "Unified Management Console for Floci Local Cloud Emulator (AWS & GCP)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <EndpointProvider>
          <CloudThemeProvider>
            <Header />
            <div className="console-workspace">
              <Sidebar />
              <main id="main-content" className="console-main">
                {children}
              </main>
            </div>
          </CloudThemeProvider>
        </EndpointProvider>
      </body>
    </html>
  );
}

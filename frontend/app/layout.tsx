"use client";

import React, { useEffect } from "react";
import "./globals.css";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { Sidebar } from "../components/Sidebar";
import { Navbar } from "../components/Navbar";
import { usePathname, useRouter } from "next/navigation";

// Pages that do not need a login and do not show the dashboard shell
const PUBLIC_PATHS = ["/login", "/register", "/onboarding"];

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Not logged in and trying to open a private page? Send them to the front door.
  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace("/onboarding");
    }
  }, [loading, user, isPublic, router]);

  if (isPublic) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  // While we check the login (or redirect), show an empty screen
  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Predictive Warehouse Stockout & Reordering Agent</title>
        <meta
          name="description"
          content="Enterprise warehouse inventory intelligence platform with automated seasonal demand forecasting, stockout risk prediction, and purchase order approval workflows."
        />
      </head>
      <body>
        <AuthProvider>
          <AppContent>{children}</AppContent>
        </AuthProvider>
      </body>
    </html>
  );
}

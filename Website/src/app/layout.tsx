import type { Metadata } from "next";
import "@/styles/styles.scss";
import GlobalProvider from "./GlobalProvider";
import ScrollToTop from "@/components/Common/ScrollToTop";
import PageLoaderWrapper from "@/components/Common/PageLoaderWrapper";
import LazyModals from "@/components/Common/LazyModals";

import { Toaster } from "react-hot-toast";
import GlobalBackground from "@/components/Common/GlobalBackground";
import NavigationEvents from "@/components/Common/NavigationEvents";
import { Suspense } from "react";
import BottomNav from "@/components/Header/BottomNav/BottomNav";
import Script from "next/script";
export const metadata: Metadata = {
  title: "Naveenam Naturals",
  description:
    "Naveenam Naturals — Pure, Natural & Handcrafted Skincare Products",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7CW1CY18CS"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7CW1CY18CS');
          `}
        </Script>
        {/* Meta Pixel Code */}
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1744527429901951');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1744527429901951&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel Code */}
      </head>
      <body>
        <GlobalProvider>
          <PageLoaderWrapper />
          <Suspense fallback={null}>
            <NavigationEvents />
          </Suspense>
          <GlobalBackground />
          {children}
          <BottomNav />
          <LazyModals />
          <ScrollToTop />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--surface)",
                color: "var(--secondary)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px var(--outline)",
              },
              success: {
                iconTheme: {
                  primary: "var(--success)",
                  secondary: "var(--surface)",
                },
              },
              error: {
                iconTheme: {
                  primary: "var(--red)",
                  secondary: "var(--surface)",
                },
              },
            }}
          />
        </GlobalProvider>
      </body>
    </html>
  );
}

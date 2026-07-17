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
            fbq('init', '4392128877769831');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=4392128877769831&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel Code */}
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5L2B3Q3K');`,
          }}
        />
      </head>
      <body>
	  <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5L2B3Q3K"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
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

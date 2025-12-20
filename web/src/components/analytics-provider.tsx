"use client";

import { publicEnv } from "@/env.public";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";

export function AnalyticsProvider() {
  return (
    <>
      {publicEnv.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={publicEnv.NEXT_PUBLIC_GA_ID} />}
      {publicEnv.NEXT_PUBLIC_GTM_ID && <GoogleTagManager gtmId={publicEnv.NEXT_PUBLIC_GTM_ID} />}
      {publicEnv.NEXT_PUBLIC_FB_PIXEL_ID && <FacebookPixel pixelId={publicEnv.NEXT_PUBLIC_FB_PIXEL_ID} />}
    </>
  );
}

function FacebookPixel({ pixelId }: { pixelId: string }) {
  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
    </>
  );
}

// // import type { NextConfig } from "next";

// // const nextConfig: NextConfig = {
// //   /* config options here */
// // };

// // export default nextConfig;


// // import withPWA from "next-pwa";
// // import type { NextConfig } from "next";

// // const nextConfig: NextConfig = {
// //   reactStrictMode: true,

// //   turbopack: {},
// // };

// // export default withPWA({
// //   dest: "public",
// //   register: true,
// //   skipWaiting: true,
// //   disable: process.env.NODE_ENV === "development",
// // })(nextConfig);


// import withPWAInit from "next-pwa";
// // const defaultRuntimeCaching =
// //   require("next-pwa/cache");
// import defaultRuntimeCaching from "next-pwa/cache";

// const withPWA = withPWAInit({
//   dest: "public",

//   register: true,

//   skipWaiting: true,

//   disable:
//     process.env.NODE_ENV ===
//     "development",

//   fallbacks: {
//     document: "/offline",
//   },

//   runtimeCaching: [
//     ...defaultRuntimeCaching,
    
//     {
//       urlPattern:
//         /\/dashboard(?:\/.*)?$/i,
//       handler: "NetworkFirst",
//       method: "GET",
//       options: {
//         cacheName:
//           "dashboard-navigation",
//         networkTimeoutSeconds: 5,
//         expiration: {
//           maxEntries: 64,
//           maxAgeSeconds: 7 * 24 * 60 * 60,
//         },
//       },
//     },
//     {
//       urlPattern:
//         /\/_next\/static\/.*/i,
//       handler: "StaleWhileRevalidate",
//       method: "GET",
//       options: {
//         cacheName: "next-static-assets",
//         expiration: {
//           maxEntries: 64,
//           maxAgeSeconds: 7 * 24 * 60 * 60,
//         },
//       },
//     },
//     {
//       urlPattern:
//         /\/_next\/data\/.*/i,
//       handler: "StaleWhileRevalidate",
//       method: "GET",
//       options: {
//         cacheName: "next-data-routes",
//         expiration: {
//           maxEntries: 32,
//           maxAgeSeconds: 7 * 24 * 60 * 60,
//         },
//       },
//     },
//     {
//       urlPattern:
//         /^\/dashboard\/invoices\/receipt\/[^/?#]+\/?$/i,
//       handler:
//         "CacheFirst",
//       method: "GET",
//       options: {
//         cacheName:
//           "invoice-receipt-dynamic",
//         expiration: {
//           maxEntries: 64,
//           maxAgeSeconds:
//             7 * 24 * 60 * 60,
//         },
//         matchOptions: {
//           ignoreSearch: true,
//         },
//       },
//     },
//     {
//       urlPattern:
//         /^\/dashboard\/invoices\/(?!(?:create|edit|receipt)(\/|$))[^/?#]+\/?$/i,
//       handler:
//         "StaleWhileRevalidate",
//       method: "GET",
//       options: {
//         cacheName:
//           "invoice-detail-dynamic",
//         expiration: {
//           maxEntries: 64,
//           maxAgeSeconds:
//             7 * 24 * 60 * 60,
//         },
//         matchOptions: {
//           ignoreSearch: true,
//         },
//       },
//     },
//   ],
// });

// const nextConfig = {
//   reactStrictMode: true,
// };

// export default withPWA(nextConfig);



import withPWAInit from "next-pwa";
import defaultRuntimeCaching from "next-pwa/cache";

const withPWA = withPWAInit({
  dest: "public",

  register: true,

  skipWaiting: true,

  disable:
    process.env.NODE_ENV ===
    "development",

  fallbacks: {
    document: "/offline",
  },

  runtimeCaching: [
    ...defaultRuntimeCaching,

    // Cache Next.js App Router RSC payloads
    {
      urlPattern: ({ request, url }: { request?: Request; url: URL }) => {
        const isRSC =
          request?.headers?.get("RSC") === "1" ||
          request?.headers?.get("rsc") === "1" ||
          url.search.includes("_rsc=");
        return !!isRSC;
      },
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "next-rsc-payloads",
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        matchOptions: {
          ignoreSearch: true,
          ignoreVary: true,
        },
      },
    },

    // Invoice receipt pages (MUST be before dashboard-navigation)
    {
      urlPattern: /^\/dashboard\/invoices\/receipt\/[^/?#]+\/?$/i,
      handler: "CacheFirst",
      method: "GET",
      options: {
        cacheName: "invoice-receipt-dynamic",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        matchOptions: {
          ignoreSearch: true,
          ignoreVary: true,
        },
      },
    },

    // Invoice detail pages (MUST be before dashboard-navigation)
    {
      urlPattern: /^\/dashboard\/invoices\/(?!(?:create|edit|receipt)(\/|$))[^/?#]+\/?$/i,
      handler: "StaleWhileRevalidate",
      method: "GET",
      options: {
        cacheName: "invoice-detail-dynamic",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        matchOptions: {
          ignoreSearch: true,
          ignoreVary: true,
        },
      },
    },

    // Dashboard navigation cache
    {
      urlPattern: /\/dashboard(?:\/.*)?$/i,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "dashboard-navigation",
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        matchOptions: {
          ignoreSearch: true,
          ignoreVary: true,
        },
      },
    },

    // Static assets
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "StaleWhileRevalidate",
      method: "GET",
      options: {
        cacheName: "next-static-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },

    // Next.js data routes
    {
      urlPattern: /\/_next\/data\/.*/i,
      handler: "StaleWhileRevalidate",
      method: "GET",
      options: {
        cacheName: "next-data-routes",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default withPWA(
  nextConfig
);
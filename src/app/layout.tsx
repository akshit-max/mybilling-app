// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";
// import { AuthProvider } from "@/context/AuthContext";
// import { Toaster } from "react-hot-toast";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// // export const metadata = {
// //   title: "myBillBook",
// //   description: "GST Billing SaaS",
// // };


// export const metadata = {
//   title: "myBillBook",
//   description: "Smart GST Billing Software",
//   manifest: "/manifest.json",
//   icons: {
//     icon: "/favicon.ico",
//     apple: "/icon-192.png",
//   },
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html
//       lang="en"
//       className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
//     >
//       <body className="min-h-full flex flex-col">
//         <AuthProvider>
//           {children}
//         </AuthProvider>
//         <Toaster position="top-right" />
//       </body>
//     </html>
//   );
// }




import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

import OfflineWatcher from "@/components/OfflineWatcher";
import PWAInstallButton from "@/components/PWAInstallButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "myBillBook",

  description: "Smart GST Billing Software",

  manifest: "/manifest.json",

  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },

  // themeColor: "#7c3aed",
};

export const viewport = {
  themeColor: "#7c3aed",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">

        <OfflineWatcher enableGlobalSync />

        <PWAInstallButton />

        <AuthProvider>
          {children}
        </AuthProvider>

        <Toaster position="top-right" />

      </body>
    </html>
  );
}
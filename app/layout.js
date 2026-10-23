import "./globals.css";

export const metadata = {
  title: "Dispatch Me — on-demand dispatch riders in Port Harcourt",
  description: "Request a verified dispatch rider in minutes. Track every delivery live.",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#2563eb" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Light is the default; apply a saved dark choice before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("dm-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

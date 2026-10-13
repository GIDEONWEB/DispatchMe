import "./globals.css";

export const metadata = {
  title: "DispatchMe — on-demand dispatch riders",
  description: "Request a verified dispatch rider in minutes. Track every delivery live.",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#ff6a00" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

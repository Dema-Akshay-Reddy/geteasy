import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";

export const metadata = {
  title: "GetEasy - AI Learning Platform",
  description: "AI-powered academic learning platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
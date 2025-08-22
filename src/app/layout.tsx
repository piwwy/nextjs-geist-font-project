import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg p-4">
          <h1 className="text-xl font-bold mb-6">Alumni System</h1>
          <nav className="flex flex-col gap-2">
            <Link href="/" className="hover:underline">Dashboard</Link>
            <Link href="/alumni" className="hover:underline">Alumni Directory</Link>
            <Link href="/jobs" className="hover:underline">Job Postings</Link>
            <Link href="/events" className="hover:underline">Events</Link>
            <Link href="/requests" className="hover:underline">Requests</Link>
            <Link href="/newsletter" className="hover:underline">Newsletter & Feedback</Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}

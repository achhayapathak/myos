import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for the MyOS waitlist and invitation system.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#090909] text-neutral-200 antialiased selection:bg-neutral-800 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-850 bg-[#090909]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group text-white hover:text-neutral-300 transition-colors"
          >
            <div className="size-6 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center font-mono text-xs font-semibold text-neutral-300 group-hover:border-neutral-500 transition-colors">
              M
            </div>
            <span className="font-semibold text-sm tracking-tight">MyOS</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-20">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-neutral-800 bg-[#141414] text-xs font-mono text-neutral-400 mb-6">
          <Shield className="size-3.5 text-neutral-400" />
          <span>DATA PROTECTION & PRIVACY</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-3">
          Privacy Policy
        </h1>
        <p className="text-sm text-neutral-500 font-mono mb-12">
          Effective date: October 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-neutral-300">
          <section className="space-y-3">
            <h2 className="text-base font-medium text-white tracking-tight">
              1. Overview
            </h2>
            <p>
              MyOS is an independent, single-user personal productivity system designed for focused daily workflows. This Privacy Policy outlines our transparent data handling practices regarding information collected through our public landing page and waitlist invitation form.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-white tracking-tight">
              2. Information We Collect
            </h2>
            <p>
              When you submit a request for an invitation to MyOS, we collect only the minimal data necessary to communicate access status and protect the system:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li>
                <strong className="text-neutral-200">Email Address:</strong> Used solely to notify you when invitation access becomes available.
              </li>
              <li>
                <strong className="text-neutral-200">Rate-Limiting Hash:</strong> An irreversible cryptographic SHA-256 hash of your client IP address. We do not store plaintext IP addresses. This hash is temporarily recorded to prevent automated spam and denial-of-service abuse.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-white tracking-tight">
              3. Purpose & Use of Data
            </h2>
            <p>We use the collected information exclusively to:</p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li>Send direct updates regarding your invitation and access status to MyOS.</li>
              <li>Enforce rate limits on waitlist submissions to maintain service reliability.</li>
            </ul>
            <p>
              We will never sell, rent, monetize, or disclose your email address or personal details to any third-party marketing services or data brokers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-white tracking-tight">
              4. Data Retention
            </h2>
            <p>
              Waitlist entries are retained securely in our PostgreSQL database protected by Row Level Security (RLS) until you request deletion or after the early-access invitation phase concludes. Rate-limiting verification hashes are strictly evaluated within short rolling time windows.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-white tracking-tight">
              5. Deletion & Your Rights
            </h2>
            <p>
              You maintain full ownership of your data. You may request the permanent removal and deletion of your email from our waitlist database at any time. Simply send an email to{" "}
              <a
                href="mailto:info@achhaya.com"
                className="text-neutral-100 underline underline-offset-4 hover:text-white"
              >
                info@achhaya.com
              </a>{" "}
              from the address you used to sign up, and we will purge your record promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-white tracking-tight">
              6. Cookies & Tracking
            </h2>
            <p>
              Our public landing page does not load third-party analytics trackers, advertising beacons, or tracking cookies. Only essential, strictly required first-party cookies are utilized for authenticated application sessions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-white tracking-tight">
              7. Security
            </h2>
            <p>
              Waitlist records are secured on Supabase PostgreSQL with Row Level Security enabled. Public direct read and write policies are disabled, and all submissions are sanitized, validated, and processed exclusively through isolated server-side routines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-white tracking-tight">
              8. Contact
            </h2>
            <p>
              For any questions regarding this Privacy Policy or our data protection measures, contact us directly at{" "}
              <a
                href="mailto:info@achhaya.com"
                className="text-neutral-100 underline underline-offset-4 hover:text-white"
              >
                info@achhaya.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-16 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} MyOS. An independent productivity workspace.</p>
          <Link
            href="/"
            className="hover:text-neutral-300 transition-colors"
          >
            Return to home
          </Link>
        </div>
      </main>
    </div>
  )
}

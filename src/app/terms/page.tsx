'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-100 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/login" 
          className="inline-block mb-8 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          ← Back to Login
        </Link>
        
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
          Terms of Service
        </h1>

        <div className="space-y-6 text-cyan-200/80">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">1. Agreement to Terms</h2>
            <p>
              By accessing or using Zirqles, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">2. Description of Service</h2>
            <p>
              Zirqles is a social media platform that allows users to create profiles, share posts, follow other users, and engage with content through various interactions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 13 years old to use this service.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must provide accurate and complete information when creating an account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">4. User Content</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You retain ownership of content you post on Zirqles.</li>
              <li>By posting content, you grant Zirqles a worldwide, non-exclusive license to use, copy, modify, and display the content.</li>
              <li>You are responsible for ensuring you have the rights to post any content.</li>
              <li>Prohibited content includes but is not limited to: illegal content, hate speech, harassment, spam, and malware.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for any illegal purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Post false, inaccurate, or misleading content</li>
              <li>Attempt to gain unauthorized access to the service</li>
              <li>Interfere with or disrupt the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">6. Termination</h2>
            <p>
              We may terminate or suspend your account at any time for any reason, including breach of these Terms. Upon termination, your right to use the service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">7. Limitation of Liability</h2>
            <p>
              Zirqles is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">9. Contact</h2>
            <p>
              For questions about these Terms, please contact us.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
} 
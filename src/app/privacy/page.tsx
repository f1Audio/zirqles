'use client'

import Link from 'next/link'

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <div className="space-y-6 text-cyan-200/80">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">1. Information We Collect</h2>
            <h3 className="font-medium mb-2 text-cyan-300">1.1 Information you provide:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (username, email, password)</li>
              <li>Profile information (name, bio, location, website)</li>
              <li>Content you post (text, images)</li>
              <li>Communications with other users</li>
            </ul>

            <h3 className="font-medium mt-4 mb-2 text-cyan-300">1.2 Automatically collected information:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Device information (IP address, browser type, device type)</li>
              <li>Usage data (interactions, time spent, features used)</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the service</li>
              <li>Personalize your experience</li>
              <li>Process your transactions</li>
              <li>Send service updates and notifications</li>
              <li>Analyze and improve our service</li>
              <li>Prevent fraud and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">3. Information Sharing</h2>
            <p>We share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Other users (based on your privacy settings)</li>
              <li>Service providers (hosting, analytics, etc.)</li>
              <li>Law enforcement (when required by law)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">4. Data Storage and Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We use AWS S3 for storing user content</li>
              <li>Data is encrypted in transit and at rest</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and monitoring</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">5. Your Rights and Choices</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and update your information</li>
              <li>Control your privacy settings</li>
              <li>Delete your account and data</li>
              <li>Opt-out of communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">6. Third-Party Services</h2>
            <p>
              We use third-party services including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Google Authentication</li>
              <li>AWS S3 for storage</li>
              <li>MongoDB for database</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">7. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">8. Changes to Privacy Policy</h2>
            <p>
              We may update this policy periodically. We will notify you of any material changes via email or through the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-cyan-300">9. Contact Us</h2>
            <p>
              For questions about this Privacy Policy, please contact us.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
} 
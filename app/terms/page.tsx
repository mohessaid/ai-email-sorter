export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-slate-600 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-700">
            By accessing and using AI Email Sorter, you accept and agree to be bound by the terms
            and conditions of this agreement. If you do not agree to these terms, please do not
            use this service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="text-slate-700 mb-4">
            AI Email Sorter is a service that helps you organize and manage your Gmail emails by:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Connecting to your Gmail account via Google OAuth</li>
            <li>Automatically classifying emails into custom categories using AI</li>
            <li>Generating summaries of your emails</li>
            <li>Providing tools to manage and organize your inbox</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
          <p className="text-slate-700 mb-4">You agree to:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Provide accurate and complete information when using the service</li>
            <li>Maintain the security of your account credentials</li>
            <li>Use the service in compliance with all applicable laws and regulations</li>
            <li>Not attempt to interfere with or disrupt the service</li>
            <li>Not use the service for any illegal or unauthorized purpose</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Gmail Access and Permissions</h2>
          <p className="text-slate-700 mb-4">
            By connecting your Gmail account, you grant AI Email Sorter permission to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Read your email messages</li>
            <li>Modify email labels and metadata</li>
            <li>Archive emails</li>
            <li>Access basic account information (email address, name)</li>
          </ul>
          <p className="text-slate-700 mt-4">
            You can revoke these permissions at any time by disconnecting your account through
            the application or through your Google account settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Privacy and Data Use</h2>
          <p className="text-slate-700">
            Your use of AI Email Sorter is also governed by our Privacy Policy. Please review
            our Privacy Policy to understand how we collect, use, and protect your information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
          <p className="text-slate-700">
            The service, including its original content, features, and functionality, is owned
            by AI Email Sorter and is protected by international copyright, trademark, patent,
            trade secret, and other intellectual property laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Disclaimer of Warranties</h2>
          <p className="text-slate-700 mb-4">
            The service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties
            of any kind, either express or implied, including but not limited to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Warranties of merchantability or fitness for a particular purpose</li>
            <li>Warranties that the service will be uninterrupted or error-free</li>
            <li>Warranties regarding the accuracy or reliability of AI classifications</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
          <p className="text-slate-700">
            In no event shall AI Email Sorter, its affiliates, or their respective officers,
            directors, employees, or agents be liable for any indirect, incidental, special,
            consequential, or punitive damages, including without limitation, loss of profits,
            data, use, or other intangible losses, resulting from your use of or inability to
            use the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Service Modifications and Termination</h2>
          <p className="text-slate-700 mb-4">
            We reserve the right to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Modify or discontinue the service at any time without notice</li>
            <li>Refuse service to anyone for any reason at any time</li>
            <li>Terminate or suspend your access for violations of these terms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. AI and Automated Processing</h2>
          <p className="text-slate-700">
            AI Email Sorter uses artificial intelligence and machine learning to classify and
            summarize emails. While we strive for accuracy, AI-generated classifications and
            summaries may not always be perfect. You should review important emails and
            classifications to ensure accuracy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Third-Party Services</h2>
          <p className="text-slate-700">
            The service may contain links to or integrate with third-party services. We are not
            responsible for the content, privacy policies, or practices of any third-party services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
          <p className="text-slate-700">
            We reserve the right to modify these terms at any time. We will notify users of any
            material changes by posting the new terms with an updated "Last updated" date. Your
            continued use of the service after any changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
          <p className="text-slate-700">
            These terms shall be governed by and construed in accordance with applicable laws,
            without regard to conflict of law provisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
          <p className="text-slate-700">
            If you have any questions about these terms, please contact us through the
            application or at the contact information provided in your account settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">15. Severability</h2>
          <p className="text-slate-700">
            If any provision of these terms is found to be unenforceable or invalid, that
            provision will be limited or eliminated to the minimum extent necessary so that
            these terms will otherwise remain in full force and effect.
          </p>
        </section>

        <div className="mt-12 pt-6 border-t">
          <a
            href="/"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

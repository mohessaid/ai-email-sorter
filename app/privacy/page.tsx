export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-slate-600 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="text-slate-700 mb-4">
            When you use AI Email Sorter, we collect and process the following information:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Your Gmail account email address</li>
            <li>OAuth tokens to access your Gmail messages</li>
            <li>Email content for AI classification and summarization</li>
            <li>Categories you create for organizing emails</li>
            <li>Usage data and preferences</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="text-slate-700 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Access and analyze your Gmail messages</li>
            <li>Classify emails into your custom categories using AI</li>
            <li>Generate summaries of your emails</li>
            <li>Provide email management and organization features</li>
            <li>Improve our service and user experience</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Security</h2>
          <p className="text-slate-700 mb-4">
            Your data is stored securely in our database. We take reasonable measures to protect
            your information from unauthorized access, disclosure, alteration, or destruction.
          </p>
          <p className="text-slate-700">
            OAuth tokens are stored in our database and used only to access your Gmail account
            on your behalf for the purposes described in this policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
          <p className="text-slate-700 mb-4">
            We use the following third-party services:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li><strong>Google OAuth:</strong> For authenticating with your Gmail account</li>
            <li><strong>Gmail API:</strong> For accessing your email messages</li>
            <li><strong>AI Service Providers:</strong> For email classification and summarization</li>
            <li><strong>Supabase:</strong> For secure data storage</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
          <p className="text-slate-700 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Disconnect your Gmail account at any time</li>
            <li>Delete your categories and data</li>
            <li>Request a copy of your data</li>
            <li>Request deletion of all your data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
          <p className="text-slate-700">
            We retain your data for as long as your account is active or as needed to provide
            services. When you disconnect an account or delete data, it is permanently removed
            from our systems.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Google API Services User Data Policy</h2>
          <p className="text-slate-700 mb-4">
            AI Email Sorter's use and transfer to any other app of information received from Google APIs
            will adhere to{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Google API Services User Data Policy
            </a>, including the Limited Use requirements.
          </p>
          <p className="text-slate-700">
            Specifically, we only use your Gmail data to provide and improve our email sorting and
            summarization features. We do not share your email content with third parties except
            as necessary to provide the service (e.g., AI providers for classification).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
          <p className="text-slate-700">
            We may update this privacy policy from time to time. We will notify you of any changes
            by posting the new policy on this page with an updated "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p className="text-slate-700">
            If you have any questions about this privacy policy or our practices, please contact us
            through the application or at the contact information provided in your account settings.
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

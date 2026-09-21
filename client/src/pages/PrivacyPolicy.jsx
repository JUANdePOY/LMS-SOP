import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-10">
      <div>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            SOP Training Platform ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our services, including integrations with Google Calendar and other third-party services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We may collect personal information such as your name, email address, organizational role, and usage data. When you connect Google Calendar, we securely store encrypted OAuth tokens to enable calendar synchronization. We do not store your Google password.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your information is used to provide and improve our training management platform, synchronize calendar events, communicate important updates, and ensure platform security. We do not sell or share your personal data with third parties for marketing purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Data Security</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We implement industry-standard security measures including encrypted token storage for Google Calendar integration, parameterized database queries, role-based access controls, and regular security audits.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Your Rights</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You have the right to access, correct, or delete your personal information. You may disconnect Google Calendar integration at any time through the Events page. For privacy concerns, contact your organization administrator.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Contact Us</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            If you have questions about this Privacy Policy, please contact your organization administrator or system administrator.
          </p>
        </section>
      </div>

      <div>
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

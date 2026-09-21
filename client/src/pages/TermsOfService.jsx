import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-10">
      <div>
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            By accessing or using the SOP Training Platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Use of the Platform</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The platform is provided for authorized organizational use. You agree to use the platform only for lawful purposes and in accordance with your organization's policies. You are responsible for maintaining the confidentiality of your account credentials.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Google Calendar Integration</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            When you connect Google Calendar, you authorize the platform to create and manage calendar events on your behalf. This integration is governed by Google's Terms of Service and Privacy Policy. You may disconnect this integration at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Intellectual Property</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            All content, features, and functionality of the platform are owned by SOP Training Platform and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Limitation of Liability</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The platform is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Changes to Terms</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. Contact Us</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            For questions about these Terms of Service, please contact your organization administrator or system administrator.
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

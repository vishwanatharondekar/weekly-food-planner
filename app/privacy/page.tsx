export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-700">
          <p className="text-sm text-gray-500">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p>
              Khana Kya Banau ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our meal planning 
              service. By using our service, you agree to the collection and use of information in accordance with 
              this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
            <p className="mb-3">We may collect the following types of personal information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email address and account credentials</li>
              <li>Name and profile information</li>
              <li>Dietary preferences and restrictions</li>
              <li>Cuisine preferences and meal settings</li>
              <li>Language preferences</li>
              <li>Meal planning history and custom recipes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.2 Usage Information</h3>
            <p className="mb-3">We automatically collect certain information about your use of our service:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Device information (browser type, operating system)</li>
              <li>IP address and location data</li>
              <li>Pages visited and features used</li>
              <li>Time spent on the service</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.3 YouTube API Data</h3>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="mb-3 font-medium">
                Our service integrates with YouTube API Services to provide cooking videos and recipe content. 
                When you use our service, we may access and collect:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>YouTube video metadata (titles, descriptions, thumbnails)</li>
                <li>Video search results and recommendations</li>
                <li>User interaction data with YouTube content</li>
                <li>Video viewing preferences and history</li>
              </ul>
              <p className="mt-3">
                This data is used solely to enhance your meal planning experience by providing relevant cooking 
                videos and recipe content.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="mb-3">We use the collected information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and maintain our meal planning service</li>
              <li>Generate personalized meal plans and recommendations</li>
              <li>Send weekly meal plan emails and service updates</li>
              <li>Improve our AI algorithms and service features</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Ensure service security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Third-Party Services</h3>
            <p className="mb-3">We may share your information with trusted third-party service providers:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email service providers for sending meal plan emails</li>
              <li>Analytics services to understand service usage</li>
              <li>Cloud storage providers for data hosting</li>
              <li>YouTube API Services for video content integration</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Legal Requirements</h3>
            <p className="mb-3">We may disclose your information if required by law or to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Comply with legal processes or government requests</li>
              <li>Protect our rights, property, or safety</li>
              <li>Protect the rights, property, or safety of our users</li>
              <li>Investigate potential violations of our terms</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.3 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred 
              to the acquiring entity, subject to the same privacy protections.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Storage and Security</h2>
            <p className="mb-3">We implement appropriate security measures to protect your information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal information on a need-to-know basis</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the internet or electronic storage is 100% secure. 
              While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Tracking Technologies</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="mb-3 font-medium">
                We use cookies and similar tracking technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Essential cookies for service functionality</li>
                <li>Analytics cookies to understand usage patterns</li>
                <li>Preference cookies to remember your settings</li>
                <li>Third-party cookies from integrated services</li>
              </ul>
              <p className="mt-3">
                You can control cookie settings through your browser preferences, but disabling certain 
                cookies may affect service functionality.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="mb-3">We retain your information for as long as necessary to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide our services to you</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Improve our services through aggregated analytics</li>
            </ul>
            <p className="mt-3">
              When you delete your account, we will delete or anonymize your personal information, 
              except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Your Rights and Choices</h2>
            <p className="mb-3">You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access and review your personal information</li>
              <li>Correct or update inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Opt-out of marketing communications</li>
              <li>Request data portability</li>
              <li>Object to certain processing activities</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact us using the information provided in the Contact section.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your information in accordance 
              with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13. If we become aware that we have collected 
              personal information from a child under 13, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Privacy Policies</h2>
            <p className="mb-3">Our service integrates with third-party services that have their own privacy policies:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Google Privacy Policy:</strong> 
                <a href="https://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:text-blue-800 underline ml-1">
                  https://www.google.com/policies/privacy
                </a>
              </li>
              <li>
                <strong>YouTube Terms of Service:</strong> 
                <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:text-blue-800 underline ml-1">
                  https://www.youtube.com/t/terms
                </a>
              </li>
            </ul>
            <p className="mt-3">
              We encourage you to review these policies to understand how these services handle your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes 
              by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage 
              you to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
            <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded">
              <p className="mb-3 font-medium">If you have any questions about this Privacy Policy, please contact us:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Email:</strong> hello@khanakyabanau.in</li>
              </ul>
              <p className="mt-3">
                We will respond to your inquiries within a reasonable timeframe, typically within 48 hours.
              </p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              By using Khana Kya Banau, you acknowledge that you have read, understood, and agree to this Privacy Policy.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Home
          </a>
          <a
            href="/terms"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            View Terms
          </a>
        </div>
      </div>
    </div>
  );
}

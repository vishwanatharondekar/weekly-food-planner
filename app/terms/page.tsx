export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
        
        <div className="space-y-6 text-gray-700">
          <p className="text-sm text-gray-500">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Khana Kya Banau ("the Service"), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use of Service</h2>
            <p className="mb-3">
              Khana Kya Banau provides meal planning, AI-powered meal suggestions, and related services. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the Service only for lawful purposes</li>
              <li>Provide accurate and complete information when creating an account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Not attempt to gain unauthorized access to the Service or its related systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Email Communications</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="mb-3 font-medium">
                By using our Service, you agree to receive weekly email communications from us, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Weekly meal plan summaries</li>
                <li>Service updates and feature announcements</li>
                <li>Tips and recommendations for meal planning</li>
              </ul>
              <p className="mt-3">
                You may unsubscribe from these emails at any time by clicking the "Unsubscribe" link at the bottom 
                of any email or by adjusting your notification settings in your account preferences.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. AI-Generated Content</h2>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <p className="mb-3 font-medium">
                Our Service utilizes artificial intelligence (AI) to provide meal suggestions and recommendations. 
                Please be aware:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>AI-generated content is meant to assist and inspire your meal planning</li>
                <li>AI systems can make mistakes or provide inaccurate information</li>
                <li>You should use your best judgment when following AI-generated suggestions</li>
                <li>Always verify nutritional information, calorie counts, and dietary restrictions</li>
                <li>Consult with healthcare professionals for specific dietary needs or concerns</li>
                <li>We are not responsible for any adverse effects resulting from following AI suggestions</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. User Content</h2>
            <p className="mb-3">
              You retain ownership of any content you submit to the Service, including meal plans, preferences, and 
              custom recipes. By submitting content, you grant us a license to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Store and process your data to provide the Service</li>
              <li>Use anonymized and aggregated data to improve our services</li>
              <li>Display your content back to you across different devices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Our collection and use of personal information is described in our 
              Privacy Policy. By using the Service, you consent to our data practices as outlined in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Disclaimer of Warranties</h2>
            <p className="mb-3">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, 
              including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Accuracy, reliability, or completeness of content</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement of third-party rights</li>
              <li>Uninterrupted or error-free operation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Health and Dietary Information</h2>
            <p className="mb-3">
              Khana Kya Banau is not a substitute for professional medical or nutritional advice. You acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>The Service does not provide medical, nutritional, or dietary advice</li>
              <li>Calorie counts and nutritional information are estimates and may not be accurate</li>
              <li>You should consult qualified healthcare professionals for dietary guidance</li>
              <li>We are not liable for any health issues arising from using the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Khana Kya Banau and its affiliates shall not be liable for 
              any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
              whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses 
              resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Account Termination</h2>
            <p className="mb-3">
              We reserve the right to suspend or terminate your account if:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You violate these Terms and Conditions</li>
              <li>You engage in fraudulent or illegal activities</li>
              <li>Your account remains inactive for an extended period</li>
              <li>We discontinue the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service, including but not limited to text, graphics, 
              logos, icons, images, and software, are the exclusive property of Khana Kya Banau and are protected 
              by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Third-Party Services</h2>
            <p>
              The Service may contain links to third-party websites or services that are not owned or controlled by 
              Khana Kya Banau. We assume no responsibility for the content, privacy policies, or practices of any 
              third-party websites or services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms and Conditions at any time. We will notify users of any 
              material changes via email or through the Service. Your continued use of the Service after such 
              modifications constitutes your acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the 
              jurisdiction in which Khana Kya Banau operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
            <p>
              If you have any questions about these Terms and Conditions, please contact us through the contact 
              information provided on our website.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              By using Khana Kya Banau, you acknowledge that you have read, understood, and agree to be bound by 
              these Terms and Conditions.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}


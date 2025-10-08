'use client';

import React from 'react';

export default function Footer() {
  const handleContactUs = () => {
    window.location.href = 'mailto:hello@khanakyabanau.in?subject=Contact Us - Khana Kya Banau';
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Legal Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <div className="space-y-3">
              <a
                href="/privacy"
                className="block text-gray-300 hover:text-white transition-colors duration-200"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="block text-gray-300 hover:text-white transition-colors duration-200"
              >
                Terms of Use
              </a>
            </div>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <button
              onClick={handleContactUs}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Contact Us
            </button>
            <p className="text-gray-400 text-sm mt-2">
              hello@khanakyabanau.in
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Khana Kya Banau. All rights reserved.
            </div>
            <div className="text-gray-400 text-sm mt-2 md:mt-0">
              Made with ❤️ and to avoid questions like "खाना क्या बनाऊं?"
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

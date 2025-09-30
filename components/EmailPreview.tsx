'use client';

import { useState, useEffect } from 'react';

export default function EmailPreview() {
  const [emailHtml, setEmailHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmailTemplate = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/test-email-template');
        if (!response.ok) {
          throw new Error('Failed to fetch email template');
        }
        const html = await response.text();
        setEmailHtml(html);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEmailTemplate();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading email template...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-800 text-white px-4 py-2">
            <h2 className="text-lg font-semibold">Email Template Preview</h2>
            <p className="text-sm text-gray-300">Testing the optimized layout with reduced margins</p>
          </div>
          <div className="h-[calc(100vh-120px)] overflow-auto">
            <iframe
              srcDoc={emailHtml}
              className="w-full h-full border-0"
              title="Email Template Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}


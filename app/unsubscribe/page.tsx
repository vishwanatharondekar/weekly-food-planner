'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail, Shield } from 'lucide-react';

interface UnsubscribeStatus {
  success: boolean;
  email?: string;
  isUnsubscribed?: boolean;
  message?: string;
  error?: string;
}

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<UnsubscribeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsubscribing, setUnsubscribing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus({
        success: false,
        error: 'Invalid unsubscribe link. Please check your email for the correct link.'
      });
      setLoading(false);
      return;
    }

    // Verify token on page load
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/unsubscribe?token=${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setStatus({
          success: true,
          email: data.email,
          isUnsubscribed: data.isUnsubscribed,
          message: data.message
        });
      } else {
        setStatus({
          success: false,
          error: data.error || 'Invalid unsubscribe link'
        });
      }
    } catch (error) {
      setStatus({
        success: false,
        error: 'Failed to verify unsubscribe link. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!token) return;

    setUnsubscribing(true);
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus({
          success: true,
          email: data.email,
          isUnsubscribed: true,
          message: data.message
        });
      } else {
        setStatus({
          success: false,
          error: data.error || 'Failed to unsubscribe. Please try again.'
        });
      }
    } catch (error) {
      setStatus({
        success: false,
        error: 'Failed to unsubscribe. Please try again.'
      });
    } finally {
      setUnsubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying...</h2>
          <p className="text-gray-600">Please wait while we verify your unsubscribe request.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {status?.success ? (
          <div className="text-center">
            {status.isUnsubscribed ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Successfully Unsubscribed
                </h1>
                <p className="text-gray-600 mb-6">
                  You have been unsubscribed from weekly meal plan emails.
                </p>
                {status.email && (
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center mb-2">
                      <Mail className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Email:</span>
                    </div>
                    <p className="text-gray-900 font-mono text-sm">{status.email}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    You will no longer receive weekly meal plan emails.
                  </p>
                  <p className="text-sm text-gray-600">
                    You can still access your meal planner by visiting our website.
                  </p>
                  <a
                    href="/"
                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Visit Meal Planner
                  </a>
                </div>
              </>
            ) : (
              <>
                <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Confirm Unsubscribe
                </h1>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to unsubscribe from weekly meal plan emails?
                </p>
                {status.email && (
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center mb-2">
                      <Mail className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Email:</span>
                    </div>
                    <p className="text-gray-900 font-mono text-sm">{status.email}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={handleUnsubscribe}
                    disabled={unsubscribing}
                    className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {unsubscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Unsubscribing...
                      </>
                    ) : (
                      'Yes, Unsubscribe Me'
                    )}
                  </button>
                  <a
                    href="/"
                    className="block text-center text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel and return to meal planner
                  </a>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Link
            </h1>
            <p className="text-gray-600 mb-6">
              {status?.error || 'This unsubscribe link is invalid or has expired.'}
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                If you're having trouble unsubscribing, please contact support.
              </p>
              <a
                href="/"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Meal Planner
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
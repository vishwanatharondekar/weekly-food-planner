'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getWeekStartDate, formatDate, getPlanUrl } from '@/lib/utils';
import AuthForm from '@/components/AuthForm';
import StorageInitializer from '@/components/StorageInitializer';
import { analytics } from '@/lib/analytics';
import { 
  Calendar, 
  ShoppingCart, 
  ChefHat, 
  Globe, 
  Download, 
  Clock, 
  Heart,
  ArrowRight,
  CheckCircle,
  Zap,
  Activity
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Redirect to home page to check meal availability and redirect appropriately
      router.replace('/home');
    } else {
      // Check for mode parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      if (mode === 'register') {
        setAuthMode('register');
        setShowAuthForm(true);
      }
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Track landing page view - fires only once per session
  useEffect(() => {
    // Only track if we're showing the landing page (not auth form or loading)
    if (!isCheckingAuth && !showAuthForm) {
      const hasTracked = sessionStorage.getItem('landing_page_viewed');
      if (!hasTracked) {
        analytics.trackEvent({
          action: 'landing_page_viewed',
          category: 'navigation',
          label: 'root_landing_page',
          custom_parameters: {
            page_path: '/',
            timestamp: new Date().toISOString(),
          },
        });
        sessionStorage.setItem('landing_page_viewed', 'true');
      }
    }
  }, [isCheckingAuth, showAuthForm]);

  const handleAuthSuccess = (token: string, user: any) => {
    // Redirect to home page to check meal availability and redirect appropriately
    router.replace('/home');
  };

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show auth form if requested
  if (showAuthForm) {
    return (
      <StorageInitializer>
        <AuthForm
          mode={authMode}
          onSuccess={handleAuthSuccess}
          onToggleMode={toggleAuthMode}
        />
      </StorageInitializer>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <img 
                  src="/images/logos/logo-pack-fe229c/icon-transparent.png" 
                  alt="Khana Kya Banau Logo" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              <span className="text-xl font-bold text-slate-800">Khana Kya Banau</span>
            </div>
            <div className="flex items-center">
              <Link 
                href="/signin" 
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6">
              <span className="text-4xl md:text-5xl">Khana Kya Banau?</span>
              <span className="block bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent mt-2">
                Plan Your Meals, Simplify Your Life
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Create personalized weekly meal plans, generate smart shopping lists, 
              and discover new recipes with our AI-powered food planning assistant. 
              Perfect for households and cooking enthusiasts!
            </p>
            <div className="flex justify-center space-x-4">
              <Link 
                href={getPlanUrl(new Date())}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Try Free</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/signin"
                className="px-8 py-4 border-2 border-blue-500 text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Sign In</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-indigo-200 rounded-full opacity-40 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-purple-200 rounded-full opacity-50 animate-pulse delay-2000"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              Everything You Need for Meal Planning
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Our comprehensive platform makes meal planning effortless and enjoyable for families
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 - Weekly Meal Planning */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Weekly Meal Planning</h3>
              <p className="text-slate-600 leading-relaxed">
                Plan your entire week's meals with our intuitive calendar interface. 
                Organize breakfast, lunch, dinner, and snacks effortlessly.
              </p>
            </div>

            {/* Feature 2 - Dietary Preferences */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Dietary Preferences</h3>
              <p className="text-slate-600 leading-relaxed">
                Customize the meals you want to plan for - Breakfast, Lunch, Snacks, and Dinner. 
                Select your preferred days for vegetarian or non-vegetarian meals.
              </p>
            </div>

            {/* Feature 3 - Smart Shopping Lists */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center mb-6">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Smart Shopping Lists</h3>
              <p className="text-slate-600 leading-relaxed">
                Automatically generate organized shopping lists from your meal plans. 
                Shopping list added to Cart directly for quick purchase.
              </p>
            </div>

            {/* Feature 4 - Recipe Discovery */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Recipe Discovery</h3>
              <p className="text-slate-600 leading-relaxed">
                Discover new recipes and cooking inspiration. Videos can be searched and saved right in the app.
              </p>
            </div>

            {/* Feature 5 - Calorie-Based Planning */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Calorie-Based Planning</h3>
              <p className="text-slate-600 leading-relaxed">
                Calorie count shown and can be used for planning for the health enthusiasts. 
                Set your target calorie count and let AI plan meals within your specified calorie goals.
              </p>
            </div>

            {/* Feature 6 - Hindi & Regional Language Support */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Hindi & Regional Language Support</h3>
              <p className="text-slate-600 leading-relaxed">
                Download your meal plans in Hindi, English, or your regional language. Our AI-powered translation 
                ensures accurate ingredient lists and recipe instructions in your preferred language.
              </p>
            </div>

            {/* Feature 7 - Export & Share */}
            <div className="lg:col-start-2 lg:col-span-1">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-4">Export & Share</h3>
                <p className="text-slate-600 leading-relaxed">
                  Export your meal plans and shopping lists as beautiful PDFs. 
                  Share with family members or save for future reference.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white/50">
      
      <div>
          <div style={{ textAlign: 'center' }}><div><h2>Plan Weekly Meals Efficiently With Khana Kya Banau</h2></div></div>
          
     <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
     <iframe style={{ width: '100%', height: '100%', position: 'absolute', left: '0px', top: '0px', borderRadius: '10px' }} src="https://embed.app.guidde.com/playbooks/mv2xmC6sMYxydy2EFbgrqq?" title="Plan Weekly Meals Efficiently With Khana Kya Banau" frameBorder="0" referrerPolicy="unsafe-url" allowFullScreen={true} allow="clipboard-write" sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-forms allow-same-origin allow-presentation"></iframe>
     </div>
          
          <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>
                      Go to <a href="https://www.khanakyabanau.in" target="_blank" rel="noreferrer">www.khanakyabanau.in</a>
                  </h3> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>1. Introduction</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
             It highlights features that simplify meal planning, generate shopping lists, and integrate recipe discovery.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F3ts2b8S7ifxFdhjNXHfHoA_doc.png?alt=media&amp;token=43d66ea5-1f1f-40f2-8e68-c3abfcb35606" alt="Introduction" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>2. Open Meal Planning Feature</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            It helps you plan your meals
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FmS3bxTg7kC4R3GcMke6MM5_doc.png?alt=media&amp;token=7bc1a38a-67ba-4c0a-a002-f5d26c37ff17" alt="Open Meal Planning Feature" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>3. Select Free Trial Option</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Try Free" to explore meal planning without having to register
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2Ffnjj3XpyUzZDXqoN9Mvj6x_doc.png?alt=media&amp;token=70497851-18f7-4863-ab5f-638d040b9c18" alt="Select Free Trial Option" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>4. Begin Setup Process</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Get Started" to initiate your personalised meal planning journey.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FvWqyERcci1MPzAXmLob1u6_doc.png?alt=media&amp;token=16917683-54ad-4e47-b232-a49bb8e586c3" alt="Begin Setup Process" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>5. Choose Maharashtrian Cuisine</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Select your cuisine
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FtVphPxZPWbAidAtaVXMYKE_doc.png?alt=media&amp;token=e636f618-1224-4d14-a80d-abcd3cddc07b" alt="Choose Maharashtrian Cuisine" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>6. Choose South Indian Cuisine</h3> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F9uLfmZ9psoTdq6e6iqPbuF_doc.png?alt=media&amp;token=ef69163c-c734-4e49-b68f-ad8de5bc69aa" alt="Choose South Indian Cuisine" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>7. Proceed To Dietary Preferences</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Next: Dietary Preferences" to specify your dietary needs and restrictions.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FvymCKvADy29zYvZyxJKdLU_doc.png?alt=media&amp;token=b75cc7bc-1258-4132-b44a-b2d6afd1b383" alt="Proceed To Dietary Preferences" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>8. Access Dietary Options</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click here if you eat non veg on specific days
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2Fedz22HA9Krziaum6SsqX2i_doc.png?alt=media&amp;token=c623ef91-152d-4e42-8e40-e3e0cbd4fab5" alt="Access Dietary Options" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>9. Modify Dietary Settings</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            You can select calorie count switch if you want to see calorie count and plan your meal according to calorie count
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FkyCwrjPss3imi9viQyW3tc_doc.png?alt=media&amp;token=96a7d4a7-9bfd-4f68-a81a-742fb8b48730" alt="Modify Dietary Settings" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>10. Enable Dietary Preference</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            You can select calorie count switch if you want to see calorie count and plan your meal according to calorie count
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FhJypjSTga8QbR7hcNU6mLd_doc.png?alt=media&amp;token=ed827ec2-ca20-4475-9031-a433eda8c516" alt="Enable Dietary Preference" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>11. Advance To Dish Selection</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Next" to see meal plan available for you
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FoxYucuRSSFr7hUVWoSbJ59_doc.png?alt=media&amp;token=1d9664ba-85c3-455a-9beb-c40fb606b1f1" alt="Advance To Dish Selection" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>12. View Meal Plan As PDF</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "PDF" to generate a printable version of your meal plan for easy reference.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FeYGYQ49aMNHXpKuon2oDWb_doc.png?alt=media&amp;token=062e7097-0f93-41fd-bbe8-e9de81578e7f" alt="View Meal Plan As PDF" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>13. Switch To List View</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Clicking on Shopping list button will present the list of ingredients required for cooking this plan
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FbWiya6d7HSb68XFtiuMuUf_doc.png?alt=media&amp;token=039bbfd7-a496-44b2-9308-76260e831380" alt="Switch To List View" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>14. Organise Plan By Day</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            You can also view the ingredients by day if you wish to shop for a particular day
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F2jmGTVuKbsTFa6oS2WUr4f_doc.png?alt=media&amp;token=8a40d63a-35bf-4977-a255-d795a6e88f07" alt="Organise Plan By Day" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>15. Review Rice Portion</h3> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FreP6rActQu2B5TTPz7Jrvr_doc.png?alt=media&amp;token=3de41b59-a046-4882-9930-647abeaa9050" alt="Review Rice Portion" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>16. Shop Ingredients Online</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Clicking on "Shop on Amazon" will take you to Amazon Fresh shopping page with one click to add all the selected ingredients to Shopping cart. 
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FnoSgPy9DXqpMvyRCHL5uEU_doc.png?alt=media&amp;token=372bc67d-9f64-4742-b1a9-db1eb60393f3" alt="Shop Ingredients Online" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>17. Navigate To Amazon Website</h3> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2Fnr1UBe9ZxoWHK6pVhGZFjh_doc.png?alt=media&amp;token=8c93facb-eeea-4923-9407-faff6796bfa2" alt="Navigate To Amazon Website" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>18. Add Items To Shopping Cart</h3> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FjXBa6FUGsHdyaYJaqXBK1n_doc.png?alt=media&amp;token=a755675e-25c5-4299-882a-977911ec1789" alt="Add Items To Shopping Cart" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>19. Proceed To Cart Review</h3> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FrQg9DXf246DfGibGLCkXww_doc.png?alt=media&amp;token=e51cf406-1c6f-4def-9d5a-f3c5e6fc0ce4" alt="Proceed To Cart Review" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>20. Select AI Meal Plan Option</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Using AI option you can generate weekly meal plan for any of the week. 
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F61x1ZZvc7fUyP5jrqhVv63_doc.png?alt=media&amp;token=37f7b839-35c7-46a1-8681-729af2f50d98" alt="Select AI Meal Plan Option" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>21. Choose Ingredients List</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            It even allows you to put ingredients you already have at home
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F9PHHV2PfMaDpxtkZ5aACNd_doc.png?alt=media&amp;token=1fde0177-54f6-429e-ae58-090f32ecad31" alt="Choose Ingredients List" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>22. Generate AI Meal Plan</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Generate AI Meal Plan" to create a customised meal schedule using AI.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FijCiSQ1M4bjB1GBRZqZjkv_doc.png?alt=media&amp;token=52a65972-e47c-4a8d-a57d-86bbd1f92a04" alt="Generate AI Meal Plan" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>23. Open Dietary Preferences</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Dietary Preferences" to review or update your dietary settings.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FnmdvetVeDAg1ibfU37JL2p_doc.png?alt=media&amp;token=f5ca3526-55ae-465e-860d-3b5552f21834" alt="Open Dietary Preferences" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>24. Access Dietary Settings</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click here to modify your dietary preferences for accurate meal recommendations.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FfC1nd2vKoKLtQkynkgG4hC_doc.png?alt=media&amp;token=dab70100-7f1b-4805-835e-8c0bf4a2154a" alt="Access Dietary Settings" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>25. Open Meal Settings</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Meal Settings" to adjust preferences related to your meal plans.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FbqY1VN31m6HTzvuYe7sjLF_doc.png?alt=media&amp;token=ab825963-4bdf-43cf-b537-abed14f9df3b" alt="Open Meal Settings" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>26. Access Meal Settings Options</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click here to explore detailed meal configuration settings.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2Fn7p4beqB7r6FkPwNtAEuZG_doc.png?alt=media&amp;token=1014435f-7b9a-472d-8376-dd3b0251437c" alt="Access Meal Settings Options" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>27. Open Video Feature</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            You can click on the video icon to search and save a video of recipe you can refer later in the PDF getting exported. 
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F24QvRXDUzEoNk9vez7zLkB_doc.png?alt=media&amp;token=45c48514-20ee-479d-b9c6-a95546120eb3" alt="Open Video Feature" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>28. Access Video Options</h3> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F8LRzLftvooVr9vMvU3wDJh_doc.png?alt=media&amp;token=a8d44626-e09b-425a-b247-03641848be6a" alt="Access Video Options" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>29. Open Video URLs Section</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Video URLs" to manage links to youtube URLs you saved
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FiZC6fwyZPhHosTFtbBFRA2_doc.png?alt=media&amp;token=dc0d9104-7773-4f75-a1db-dca6d88e45d7" alt="Open Video URLs Section" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>30. Close Video URLs</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "✕" to close the video URLs management window.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F7BLEdZT5ttT8PbJUTfmW3C_doc.png?alt=media&amp;token=c5a9b29e-ed59-4f5b-951a-8df4526500cc" alt="Close Video URLs" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>31. Open Language Preferences</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Click "Language Preferences" to choose your preferred language settings.
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2F8X355KAdhQT9eJxD7mpGfB_doc.png?alt=media&amp;token=8fffdbb8-dcec-4496-a57d-c3f643c234cb" alt="Open Language Preferences" /> <h3 style={{ fontSize: '1.17em', fontWeight: 'bold', margin: '1em 0', width: '100%', wordBreak: 'break-word', maxWidth: '100%' }}>32. Save Language Settings</h3> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Language selected here will be used for translation of PDFs so you can share them with anyone in the language they prefer
            
        </div> <img width="100%" src="https://static.guidde.com/v0/qg%2F9w9EPiSEZkV3Z6qBlIjJSledUiu2%2Fmv2xmC6sMYxydy2EFbgrqq%2FcunxDsdhwPZj2jkJ4onyY1_doc.png?alt=media&amp;token=d98b238d-656d-4ed3-a454-f7716df70419" alt="Save Language Settings" /> <div style={{ marginTop: '16px', marginBottom: '16px' }} >
            Thank You!
            
        </div>
          <div style={{ marginRight: '2px' }}><a href="https://www.guidde.com" rel="noreferrer" target="_blank" style={{ textDecoration: 'none', color: '#000000' }}>Powered by <strong style={{ color: '#CB0000' }}>guidde</strong></a></div>
      </div>
      
      
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Set Your Preferences</h3>
              <p className="text-slate-600">
                Tell us about your dietary preferences, meal types, and any restrictions. 
                Our AI will learn your tastes and preferences.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Plan Your Meals</h3>
              <p className="text-slate-600">
                Use our intuitive interface to plan your weekly meals. 
                Get suggestions, browse recipes, and organize your schedule.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Shop & Cook</h3>
              <p className="text-slate-600">
                Generate your shopping list, shop from online apps, export to PDF, and start cooking! 
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-slate-800 mb-6">
            Save Time, Reduce Stress, Cook Better
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Save 3+ Hours Per Week</h3>
              <p className="text-slate-600">No more wondering what to cook or last-minute grocery runs</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Reduce Food Waste</h3>
              <p className="text-slate-600">Plan precise portions and use ingredients efficiently</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Cook Healthier Meals</h3>
              <p className="text-slate-600">Make informed choices with balanced, nutritious meal plans and traditional recipes</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Meal Planning?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href={getPlanUrl(new Date())}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
# 🚀 Vercel Deployment Guide

This guide will help you deploy the Weekly Food Planner to Vercel with proper server-side security.

## Prerequisites

1. **GitHub Account**: Your code should be on GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Firebase Project**: Set up Firebase Firestore
4. **Google AI Studio**: Get Gemini API key
5. **Node.js**: Version 18.17.0 or higher (for local development)

## Step 1: Prepare Your Code

Make sure your project structure looks like this:
```
weekly-food-planner/
├── app/
│   ├── api/           # Server-side API routes
│   ├── components/
│   └── page.tsx
├── package.json
├── vercel.json
└── README.md
```

## Step 2: Firebase Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Firestore Database

2. **Get Firebase Config**:
   - Project Settings → General → Your Apps
   - Add a web app if not already added
   - Copy the configuration values

3. **Set up Firestore Security Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /mealPlans/{mealPlanId} {
         allow read, write: if request.auth != null && 
           resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

## Step 3: Google AI Studio Setup

1. **Get Gemini API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com)
   - Create a new API key
   - Copy the key (you'll need this for environment variables)

## Step 4: Deploy to Vercel

1. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

3. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add the following variables:

   ```bash
   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   FIREBASE_APP_ID=your_app_id

   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

## Step 5: Verify Deployment

1. **Test Authentication**:
   - Register a new account
   - Login with your credentials
   - Verify data is saved to Firebase

2. **Test AI Features**:
   - Add some meal data
   - Try the "Fill Empty Slots" feature
   - Verify AI suggestions work

3. **Check Security**:
   - Open browser dev tools
   - Check Network tab
   - Verify API keys are not exposed in client-side code

## Environment Variables Reference

### Firebase Configuration
```bash
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### Google Gemini AI
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## Security Benefits

✅ **Server-side API Keys**: All sensitive keys are hidden from client
✅ **Password Hashing**: Secure password storage with bcrypt
✅ **Token Authentication**: JWT-like session management
✅ **Firebase Security**: Server-side database access only
✅ **CORS Protection**: Built-in security headers

## Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility (>=18.17.0)
   - Check build logs in Vercel dashboard

2. **Environment Variables Missing**:
   - Go to Project Settings → Environment Variables
   - Add all required variables
   - Redeploy after adding variables

3. **Firebase Connection Issues**:
   - Verify Firebase config is correct
   - Check Firestore security rules
   - Ensure collections exist: `users`, `mealPlans`

4. **AI Not Working**:
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API key has proper permissions
   - Test with a simple API call

### Debugging

1. **Check Vercel Logs**:
   - Go to your project in Vercel dashboard
   - Click on the latest deployment
   - Check "Functions" tab for API route logs

2. **Test API Routes**:
   ```bash
   # Test authentication
   curl -X POST https://your-app.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password","name":"Test User"}'
   ```

3. **Check Firebase Console**:
   - Verify data is being written to Firestore
   - Check for any permission errors

## Post-Deployment

1. **Set up Custom Domain** (Optional):
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS settings

2. **Monitor Performance**:
   - Use Vercel Analytics
   - Monitor API route performance
   - Check for any errors

3. **Scale as Needed**:
   - Vercel automatically scales
   - Monitor usage in dashboard
   - Upgrade plan if needed

## Support

If you encounter issues:
1. Check the [Vercel documentation](https://vercel.com/docs)
2. Review Firebase console for errors
3. Check browser console for client-side errors
4. Open an issue on GitHub

---

**Your app is now securely deployed with all API keys hidden server-side! 🎉** 
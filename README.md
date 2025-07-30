# Weekly Food Planner

A modern web application for planning weekly meals with AI-powered suggestions using Google Gemini 1.5 Pro.

## 🚀 **Deployment on Vercel**

### **Prerequisites**
1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Firebase Project**: Set up Firebase Firestore
3. **Google AI Studio**: Get Gemini API key

### **Environment Variables Setup**

Create a `.env.local` file in the root directory with:

```bash
# Firebase Configuration (Server-side)
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id

# Google Gemini AI (Server-side)
GEMINI_API_KEY=your_gemini_api_key_here
```

### **Deployment Steps**

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy!

3. **Environment Variables in Vercel**:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Redeploy after adding variables

### **Security Benefits**

✅ **API Keys Hidden**: All sensitive keys are server-side only
✅ **Secure Authentication**: Password hashing with bcrypt
✅ **Token-based Auth**: JWT-like tokens for session management
✅ **Server-side AI**: Gemini API calls happen on server
✅ **Firebase Security**: Direct database access only from server

## Features

### **Core Functionality**
- 📅 **Weekly Meal Planning**: Plan breakfast, morning snack, lunch, evening snack, and dinner for each day
- 👤 **User Authentication**: Secure registration and login system
- 💾 **Data Persistence**: Firebase Firestore for cloud storage
- 🔄 **Real-time Sync**: Automatic data synchronization

### **AI-Powered Features**
- 🤖 **Smart Suggestions**: AI-generated meal recommendations using Google Gemini 1.5 Pro
- 📊 **Learning from History**: AI analyzes your past meal choices
- 🎯 **Personalized Recommendations**: Tailored to your preferences
- 🔒 **Secure AI Processing**: All AI calls happen server-side

### **Dietary Preferences**
- 🥬 **Vegetarian Support**: Toggle vegetarian diet mode
- 🍖 **Non-Veg Days**: Select specific days for non-vegetarian meals
- 🚫 **No Cross-Contamination**: AI respects dietary restrictions
- ⚙️ **Flexible Configuration**: Easy preference management

### **User Experience**
- 📱 **Responsive Design**: Works on desktop and mobile
- ⚡ **Fast Performance**: Optimized with debouncing and caching
- 🎨 **Modern UI**: Clean, intuitive interface with Tailwind CSS
- 🔔 **Real-time Feedback**: Toast notifications and loading states

## Tech Stack

### **Frontend**
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React Hot Toast**: User notifications
- **Lucide React**: Beautiful icons
- **Date-fns**: Date manipulation

### **Backend (Server-side)**
- **Next.js API Routes**: Server-side API endpoints
- **Firebase Firestore**: Cloud database
- **bcryptjs**: Password hashing
- **Google Generative AI**: Gemini 1.5 Pro integration

### **Security**
- **Server-side Processing**: All sensitive operations on server
- **Password Hashing**: Secure password storage
- **Token Authentication**: JWT-like session management
- **Environment Variables**: Secure key management

## Project Structure

```
weekly-food-planner/
├── app/
│   ├── api/                    # Server-side API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── meals/             # Meal management endpoints
│   │   └── ai/                # AI generation endpoints
│   ├── components/            # React components
│   ├── lib/                   # Utilities and configurations
│   └── page.tsx              # Main application page
├── public/                    # Static assets
├── package.json              # Dependencies and scripts
├── vercel.json              # Vercel deployment config
└── README.md                # Project documentation
```

## Installation

### **Prerequisites**
- **Node.js**: Version 18.17.0 or higher
- **npm**: Package manager (comes with Node.js)

### **Local Development**

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd weekly-food-planner
   ```

2. **Set up Node.js version** (if using nvm):
   ```bash
   nvm use
   # This will automatically use the version specified in .nvmrc
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment variables**:
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Firebase and Gemini API keys
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### **Firebase Setup**

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Firestore Database

2. **Configure Firestore**:
   - Set up security rules
   - Create collections: `users`, `mealPlans`

3. **Get Configuration**:
   - Project Settings → General → Your Apps
   - Copy configuration values

### **Google AI Studio Setup**

1. **Get API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com)
   - Create a new API key
   - Copy the key for environment variables

## Usage

### **Getting Started**

1. **Register/Login**: Create an account or sign in
2. **Plan Meals**: Enter your meals for the current week
3. **Build History**: Add meals for multiple weeks
4. **Enable AI**: Once you have history, AI suggestions become available
5. **Configure Preferences**: Set dietary preferences for better suggestions

### **AI Features**

- **Fill Empty Slots**: AI suggests meals for empty fields only
- **Learning System**: AI learns from your historical meal choices
- **Dietary Respect**: AI respects your vegetarian/non-vegetarian preferences
- **Smart Suggestions**: Personalized recommendations based on your patterns

### **Dietary Preferences**

- **Vegetarian Toggle**: Enable/disable vegetarian diet
- **Non-Veg Days**: Select specific days for non-vegetarian meals
- **AI Compliance**: Suggestions respect your dietary restrictions
- **No Cross-Contamination**: Vegetarian and non-vegetarian meals don't mix

## API Endpoints

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### **Meals**
- `GET /api/meals/[weekStartDate]` - Get meal plan for week
- `PUT /api/meals/[weekStartDate]` - Update meal plan
- `GET /api/meals/history` - Get meal history for AI

### **AI**
- `POST /api/ai/generate` - Generate AI meal suggestions

### **Dietary Preferences**
- `GET /api/auth/dietary-preferences` - Get user preferences
- `PUT /api/auth/dietary-preferences` - Update preferences

## Security

### **Server-side Security**
- ✅ All API keys stored server-side only
- ✅ Password hashing with bcrypt
- ✅ Token-based authentication
- ✅ Input validation and sanitization
- ✅ CORS protection

### **Database Security**
- ✅ Firebase Firestore security rules
- ✅ User-specific data isolation
- ✅ Server-side data access only

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ using Next.js, Firebase, and Google Gemini AI** 
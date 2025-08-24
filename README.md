# LocalAlert Web Dashboard

A modern web interface for the LocalAlert emergency notification system, built with React and Firebase.

## 🚀 Features

- **Real-time Dashboard** - View emergency alerts and system statistics
- **User Authentication** - Secure login/signup with Firebase Auth
- **Alert Management** - Post, view, and manage emergency notifications
- **Organization Management** - Handle multiple organizations and their members
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Modern UI** - Built with Tailwind CSS and Lucide React icons

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Firebase (Auth, Firestore, Storage)
- **State Management**: React Context API
- **Notifications**: React Hot Toast

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project (same as your mobile app)

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd localalert-web
npm install
```

### 2. Configure Firebase

1. Copy your Firebase configuration from your mobile app's `GoogleService-Info.plist` or Firebase Console
2. Update `src/services/firebase.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
}
```

### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
localalert-web/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React Context providers
│   ├── pages/               # Page components
│   ├── services/            # API and external services
│   ├── utils/               # Utility functions
│   ├── styles/              # CSS and styling
│   ├── App.jsx             # Main app component
│   └── main.jsx            # App entry point
├── public/                  # Static assets
├── package.json            # Dependencies and scripts
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── README.md              # This file
```

## 🔐 Authentication

The web app uses Firebase Authentication with email/password. Users can:
- Sign up for new accounts
- Sign in with existing credentials
- Access protected routes based on authentication status

## 📱 Mobile App Integration

This web dashboard is designed to work alongside your existing LocalAlert iOS app:

- **Shared Database**: Both apps use the same Firebase Firestore database
- **Shared Authentication**: Users can sign in with the same credentials
- **Real-time Sync**: Changes made in the web app appear in the mobile app and vice versa

## 🎨 Customization

### Colors
Update the color scheme in `tailwind.config.js`:

```javascript
colors: {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    // ... more shades
  }
}
```

### Components
All UI components are built with Tailwind CSS classes and can be easily customized by modifying the component files.

## 🚀 Deployment

### Firebase Hosting (Recommended)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Build the project:
```bash
npm run build
```

3. Deploy to Firebase:
```bash
firebase init hosting
firebase deploy --only hosting
```

### Other Platforms

The built project can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3
- GitHub Pages

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Adding New Pages

1. Create a new component in `src/pages/`
2. Add the route to `src/App.jsx`
3. Add navigation link in `src/components/Layout.jsx`

### Adding New Components

1. Create component file in `src/components/`
2. Import and use in your pages
3. Follow the existing component patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the LocalAlert system and follows the same licensing terms.

## 🆘 Support

For support or questions:
- Check the Firebase documentation
- Review the React and Tailwind CSS documentation
- Open an issue in the repository

## 🔮 Future Enhancements

- **Real-time Notifications** - Web push notifications
- **Advanced Analytics** - Detailed usage statistics
- **API Integration** - Connect with external emergency services
- **Multi-language Support** - Internationalization
- **Dark Mode** - Theme switching
- **PWA Features** - Offline support and app-like experience

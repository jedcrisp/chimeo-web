# Chimeo Web Application

A React-based web dashboard for managing emergency alerts and organizations, built with Vite and Firebase.

## Features

- 🔐 **Authentication** - Google Sign-in and email/password
- 🗺️ **Interactive Maps** - Google Maps integration with organization markers
- 🏢 **Organization Management** - Create, edit, and manage organizations
- 📱 **Push Notifications** - Real-time alert notifications
- 👥 **User Management** - Follow organizations and manage profiles
- 📊 **Admin Dashboard** - Comprehensive organization oversight

## Environment Setup

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Getting Your Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Enable the following APIs:
   - Google Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your domains for security

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The application uses:
- **React 18** with hooks and context
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Firebase** for backend services
- **Google Maps** for interactive mapping

## Security Notes

- API keys are stored in environment variables (`.env`)
- The `.env` file is excluded from git tracking
- Never commit sensitive credentials to version control

## Deployment

When deploying to production:
1. Set up environment variables on your hosting platform
2. Update Google Maps API key restrictions to include your production domain
3. Ensure Firebase configuration is properly set up

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

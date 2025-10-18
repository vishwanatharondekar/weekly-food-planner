# Scripts Directory

This directory contains utility scripts for the weekly food planner application.

## Available Scripts

### Core Scripts

#### `test-cuisines-reading.js`
- **Purpose**: Test reading and parsing cuisines.json
- **Usage**: `node scripts/test-cuisines-reading.js`

### Utility Scripts

#### `add-email-validation.js`
- **Purpose**: Add email validation functionality
- **Usage**: `node scripts/add-email-validation.js`

#### `export-users.js`
- **Purpose**: Export user data from Firestore
- **Usage**: `node scripts/export-users.js`

#### `test-proxy-curl.sh`
- **Purpose**: Test proxy functionality with curl
- **Usage**: `bash scripts/test-proxy-curl.sh`

## Configuration

### Environment Variables
```bash
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id

# Other required environment variables
# See env.example for complete list
```

## Notes

- **Image Mapping**: Image mapping functionality has been moved to a separate service and is accessed via the lambda endpoint
- **Dependencies**: Most scripts are self-contained and don't require external dependencies
- **Firebase**: Some scripts require Firebase configuration for database operations

## Support

For issues or questions:
1. Check the script logs for error details
2. Verify environment variables and file paths
3. Ensure Firebase is properly configured for database operations
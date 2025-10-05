# User Export Script

Simple Node.js script to export all users from Firestore to a CSV file.

## Usage

Run the script from the project root:

```bash
node scripts/export-users.js
```

The script will:
- Connect to your Firestore database using existing environment variables
- Export all users to a CSV file with timestamp: `users-export-YYYY-MM-DD_HH-MM-SS.csv`
- Display the number of users exported and file size

## CSV Format

The exported CSV includes the following columns:

- **User ID**: Firestore document ID
- **Email**: User's email address
- **Name**: User's display name
- **Is Guest**: Whether the user is a guest user (true/false)
- **Onboarding Completed**: Whether user completed onboarding (true/false)
- **AI Usage Count**: Number of AI meal plan generations
- **Shopping List Usage Count**: Number of shopping list generations
- **Created At**: Account creation timestamp (ISO format)
- **Updated At**: Last update timestamp (ISO format)
- **Email Subscribed**: Whether user is subscribed to emails (true/false)
- **Meals Per Day**: User's meal settings - meals per day
- **Days Per Week**: User's meal settings - days per week
- **Cuisine Preferences**: Semicolon-separated list of cuisines
- **Dietary Preferences**: Semicolon-separated list of dietary restrictions
- **Breakfast Preferences**: Semicolon-separated list of breakfast dish types
- **Lunch/Dinner Preferences**: Semicolon-separated list of lunch/dinner dish types
- **Preferred Language**: User's preferred language code

## Notes

- Array fields (cuisines, preferences, etc.) are joined with semicolons (`;`) for easier CSV parsing
- CSV fields containing commas, quotes, or newlines are properly escaped
- Timestamps from Firestore are converted to ISO 8601 format
- The script uses the same Firebase configuration as your Next.js app


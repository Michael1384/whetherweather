# OpenAI API Setup Guide

## Step 1: Get Your OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in or create an OpenAI account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-`)
5. **Important**: Save this key securely - you won't be able to see it again!

## Step 2: Add API Key to Your Project

### Option A: Environment File (Recommended)
1. Open the `.env.local` file in your project root
2. Replace `your_openai_api_key_here` with your actual API key:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
3. Restart your development server (`npm run dev`)

### Option B: Direct Code Update (Less Secure)
If you don't want to use environment variables, you can directly update the code:
1. Open `src/App.tsx`
2. Find line 5: `const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY || "your_api_key_here";`
3. Replace `"your_api_key_here"` with your actual API key:
   ```javascript
   const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY || "sk-your-actual-api-key-here";
   ```

## Step 3: Test the API

1. Start your development server: `npm run dev`
2. Go to the Survey page
3. Fill out the survey and submit
4. The app should now make API calls to OpenAI and return location recommendations

## API Features Currently Implemented

The app uses OpenAI's GPT-4o-mini model for:

1. **Weather Activity Suggestions**: Recommends activities based on weather conditions
2. **Perfect Date Finder**: Suggests optimal dates for your planned activities  
3. **Survey Location Recommendations**: Analyzes your survey responses and recommends ideal global locations

## Troubleshooting

### API Key Issues
- Make sure your API key starts with `sk-`
- Ensure you have credits in your OpenAI account
- Check that the key is copied correctly (no extra spaces)

### CORS Issues
- The app makes direct API calls to OpenAI
- This works in development but may need a backend proxy in production

### Rate Limits
- OpenAI has rate limits based on your plan
- Free tier has lower limits than paid plans
- If you hit limits, wait a few minutes before trying again

## Cost Information

- GPT-4o-mini is very cost-effective (~$0.15 per 1M input tokens)
- Each survey submission uses approximately 200-500 tokens
- Monitor your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)

## Security Note

Never commit your API key to version control! The `.env.local` file should be in your `.gitignore`.

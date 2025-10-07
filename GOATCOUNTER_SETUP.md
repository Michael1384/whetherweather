# GoatCounter Setup Instructions

To get real, honest visitor analytics for your WhetherWeather app:

## Step 1: Create GoatCounter Account (FREE)
1. Go to https://www.goatcounter.com/
2. Click "Sign up" 
3. Choose a site code (e.g., "whetherweather")
4. This will give you: `https://whetherweather.goatcounter.com`

## Step 2: Update Your Code
1. In `index.html`, the GoatCounter script is already added
2. Replace `whetherweather` in the script with YOUR site code:
   ```html
   <script data-goatcounter="https://YOUR-SITE-CODE.goatcounter.com/count"
   ```

## Step 3: Get API Token (Optional - for counter display)
1. Go to your GoatCounter dashboard
2. Settings → API → Create new token
3. Add to your environment variables in Netlify:
   - Key: `VITE_GOATCOUNTER_TOKEN`
   - Value: Your API token

## Step 4: Update API Call
In `App.tsx`, replace `YOUR_API_TOKEN` with:
```javascript
import.meta.env.VITE_GOATCOUNTER_TOKEN
```

## What You Get:
- ✅ **Honest visitor count** starting from 0
- ✅ **Privacy-focused** (no cookies, GDPR compliant)
- ✅ **Real-time analytics** dashboard
- ✅ **Free forever** for reasonable usage
- ✅ **No fake numbers** - real visitors only

## Current Fallback:
Until you set up GoatCounter, the app uses localStorage starting from 0, counting unique daily visits honestly.

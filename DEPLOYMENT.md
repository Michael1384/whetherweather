# Netlify Deployment Guide

## Manual Deploy (Drag & Drop)

1. **Build locally** (already done):
   ```bash
   npm run build
   ```

2. **Set Environment Variable in Netlify**:
   - Go to Netlify Dashboard → Your Site → Site settings → Environment variables
   - Add new variable:
     - Key: `VITE_OPENAI_API_KEY`
     - Value: Your OpenAI API key

3. **Deploy**:
   - Drag and drop the `dist` folder to Netlify deploy area

## GitHub Integration Deploy

1. **Connect Repository**:
   - Netlify Dashboard → New site from Git → Connect GitHub
   - Select your `whetherweather` repository

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

3. **Environment Variables**:
   - Add `VITE_OPENAI_API_KEY` in Site settings → Environment variables

## Important Notes

- The `.env` file is ignored by git (for security)
- Environment variables must be set in Netlify dashboard
- The app will work after setting the API key in Netlify
- Use `npm run build-with-types` if you want to fix TypeScript errors later

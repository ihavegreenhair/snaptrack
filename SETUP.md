# SnapTrack Setup Guide

This guide will help you set up and deploy SnapTrack for your party or event.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)
- Git installed

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd snaptrack-clean
npm install
```

### 2. Supabase Setup

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose your organization and create the project

2. **Set up the database**
   - In your Supabase dashboard, go to the SQL editor
   - Run the SQL from `supabase-schema.sql` to create tables

3. **Configure Storage**
   - Go to Storage in your Supabase dashboard
   - Create a new bucket called `photos`
   - Make it **public** (important for displaying images)
   - Set the following bucket policy:
   ```sql
   CREATE POLICY "Anyone can view photos" ON storage.objects
   FOR SELECT USING (bucket_id = 'photos');
   
   CREATE POLICY "Anyone can upload photos" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'photos');
   ```

4. **Enable Realtime**
   - Go to Database → Replication in Supabase
   - Enable realtime for `queue_items` and `votes` tables

5. **Deploy Edge Functions**
   - Install the Supabase CLI: `npm install supabase --save-dev`
   - Login to Supabase: `npx supabase login`
   - Link your project: `npx supabase link --project-ref your-project-ref`
   - Deploy the functions: `npx supabase functions deploy youtube-search`

### 3. Environment Configuration

1. Copy the environment example:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Find these in your Supabase project settings → API

   **Note:** No YouTube API key required! We use Supabase Edge Functions for YouTube search.

### 4. Development

Start the development server:
```bash
npm run dev
```

Visit `http://localhost:5173` to see your SnapTrack app!

## 🌐 Deployment

### Option 1: Vercel (Recommended)

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Add environment variables**
   - In Vercel dashboard, go to your project settings
   - Add the same environment variables from your `.env` file

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Netlify

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Drag the `dist` folder to netlify.com/drop
   - Or connect your Git repository in Netlify dashboard

3. **Add environment variables**
   - In Netlify dashboard, go to Site settings → Environment variables
   - Add your Supabase credentials

### Option 3: Static Hosting

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Upload the `dist` folder** to any static hosting service:
   - GitHub Pages
   - AWS S3 + CloudFront  
   - Any web server

## 📱 Party Setup

### For the Host (Laptop/Desktop)

1. **Open the app** in a modern browser (Chrome, Firefox, Safari)
2. **Share the URL** with your guests
3. **Optionally generate a QR code** (when that feature is implemented)
4. **Keep the browser tab active** for auto-play to work properly

### For Guests (Mobile)

1. **Visit the same URL** on their phones
2. **Search for songs** using the search bar
3. **Take a selfie** when submitting songs
4. **Vote on songs** in the queue

## 🔧 Configuration Options

### Song Length Limits

By default, songs over 6 minutes are blocked. To change this:

1. Edit `src/lib/youtube.ts`
2. Modify the `MAX_SONG_LENGTH` constant:
   ```typescript
   export const MAX_SONG_LENGTH = 8 * 60; // 8 minutes
   ```

### Customizing the UI

- Colors and styling can be customized via TailwindCSS classes
- The app uses shadcn/ui components for consistent design
- Modify `src/index.css` for global styles

## 🛠️ Troubleshooting

### Common Issues

**"Missing Supabase environment variables"**
- Check that your `.env` file exists and has the correct variables
- Verify the variable names start with `VITE_`

**Photos not displaying**
- Ensure your Supabase storage bucket is public
- Check the bucket policies allow public read access

**Videos not auto-playing**
- Modern browsers require user interaction before auto-playing videos
- Make sure the host browser tab stays active

**Real-time updates not working**
- Verify Realtime is enabled for your tables in Supabase
- Check browser console for WebSocket connection errors

**YouTube search not working**
- Check browser console for network errors
- Verify the Edge Function is deployed: `npx supabase functions list`
- Check Edge Function logs: `npx supabase functions logs youtube-search`
- If search fails, fallback demo songs will be shown

### Getting Help

1. Check the browser console for errors
2. Verify Supabase dashboard shows data being created
3. Test with multiple devices/browsers
4. Check network connectivity and firewall settings

## 📋 Production Checklist

Before your party:

- [ ] Supabase project is set up with correct permissions
- [ ] App is deployed and accessible via HTTPS
- [ ] QR code generated for easy guest access (if implemented)
- [ ] Test song submission and voting workflow
- [ ] Test video playback and auto-advance
- [ ] Verify real-time updates work across devices
- [ ] Clear any test data from the queue

## 🎉 Party Tips

- **Host device**: Use a laptop/desktop with good speakers or connect to a sound system
- **Guest access**: Share the URL via QR code, text, or social media
- **Internet**: Ensure stable WiFi for all guests
- **Backup**: Have a backup playlist ready in case of technical issues
- **Moderation**: Use the "Clear Queue" button if needed to manage the queue

Enjoy your SnapTrack party! 🎵📸
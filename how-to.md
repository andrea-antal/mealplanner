# Start the Backend
```
cd /Users/andreachan/Desktop/mealplanner/backend
source venv/bin/activate
uvicorn app.main:app --reload
```
The backend will start on http://localhost:8000

# Start the Frontend
Open a new terminal window/tab and run:
```
cd /Users/andreachan/Desktop/mealplanner/frontend
npm run dev
```
The frontend will start on http://localhost:5173 (or the next available port)

# Quick Tips
- The `--reload` flag on the backend automatically restarts when you change Python files
- Keep both terminals running while you're working on the app
- If you get port conflicts, you can stop processes using those ports or the tools will automatically use the next available port
- Make sure you have your `ANTHROPIC_API_KEY` set in the backend's .env file for the recipe generation feature to work

---

# Deployment Guide

## Recommended Setup: Vercel (Frontend) + Railway (Backend)

This is the best setup for your meal planner because:
- **Vercel**: Perfect for React/Vite frontends, global CDN, generous free tier
- **Railway**: Handles long-running FastAPI processes, persistent storage for Chroma DB, auto-scaling

---

# Deploy Backend to Railway (Recommended)

## Prerequisites

1. Create a [Railway account](https://railway.app/) (free, no credit card required for $5/month free tier)
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

## Step-by-Step Railway Deployment

### 1. Login to Railway
```bash
railway login
```
This will open a browser window for authentication.

### 2. Initialize Railway Project
```bash
cd /Users/andreachan/Desktop/mealplanner/backend
railway init
```

Follow the prompts:
- Project name: `mealplanner-backend` (or your choice)
- Empty project: Yes

### 3. Configure Environment Variables

Add your Anthropic API key:
```bash
railway variables set ANTHROPIC_API_KEY=your_api_key_here
```

Railway will automatically detect:
- `PORT` (Railway assigns this dynamically)
- Python runtime from `requirements.txt`

### 4. Deploy to Railway
```bash
railway up
```

This will:
- Build your app
- Install dependencies from `requirements.txt`
- Deploy and start your FastAPI server
- Provide you with a deployment URL

### 5. Get Your Backend URL
```bash
railway open
```

This opens your Railway dashboard. Your backend URL will be something like:
`https://mealplanner-backend-production.up.railway.app`

Copy this URL - you'll need it for the frontend deployment.

### 6. Enable Persistent Storage (for Chroma DB)

In the Railway dashboard:
1. Click on your service
2. Go to "Settings" → "Volumes"
3. Click "Add Volume"
4. Mount path: `/app/data`
5. Size: 1GB (free tier includes this)

This ensures your recipe data and Chroma DB persist across deployments.

### 7. Configure CORS for Your Frontend

You'll need to update CORS settings after deploying your frontend. For now, you can add Railway's domain:

Edit `backend/app/main.py` and update the origins list:
```python
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://*.railway.app",  # Allow Railway preview deployments
    # You'll add your Vercel URL here after frontend deployment
]
```

Then redeploy:
```bash
railway up
```

## Railway Free Tier Details

- **$5/month in free credits** (resets monthly)
- **500 hours of execution** (plenty for 24/7 uptime)
- **Persistent storage** (1GB included)
- **No spin-down** (app stays always-on)
- **No credit card required**

---

# Deploy Frontend to Vercel

## Prerequisites

1. Create a [Vercel account](https://vercel.com/) (free)
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

## Step-by-Step Vercel Deployment

### 1. Deploy Frontend

```bash
cd /Users/andreachan/Desktop/mealplanner/frontend
vercel
```

Follow the prompts:
- Set up and deploy: **Yes**
- Which scope: Choose your account
- Link to existing project: **No** (first time) or **Yes** (subsequent deploys)
- Project name: `mealplanner` (or your choice)
- In which directory is your code located: **.**
- Want to modify settings: **No** (Vercel auto-detects Vite)

### 2. Set Environment Variable

Set the `VITE_API_URL` to point to your Railway backend:

```bash
vercel env add VITE_API_URL
```

When prompted, enter your Railway backend URL:
```
https://mealplanner-backend-production.up.railway.app
```

Select **all environments** (Production, Preview, Development).

### 3. Deploy to Production

```bash
vercel --prod
```

This creates your production deployment. Copy the URL (e.g., `https://mealplanner.vercel.app`).

### 4. Update Backend CORS

Now update your backend to allow requests from your Vercel frontend.

Edit `backend/app/main.py`:
```python
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://*.railway.app",
    "https://mealplanner.vercel.app",  # Add your Vercel URL
    "https://*.vercel.app",  # Allow Vercel preview deployments
]
```

Redeploy backend:
```bash
cd /Users/andreachan/Desktop/mealplanner/backend
railway up
```

### 5. Test Your Deployment

1. Visit your Vercel frontend URL
2. Test recipe generation from groceries
3. Test meal plan generation
4. Test the new "+" icon feature on meal suggestions
5. Check that all API calls work

---

## Updating Your Deployments

### Update Frontend
```bash
cd /Users/andreachan/Desktop/mealplanner/frontend
vercel --prod
```

### Update Backend
```bash
cd /Users/andreachan/Desktop/mealplanner/backend
railway up
```

Or link to a GitHub repo for automatic deployments on every push:
```bash
railway link
```

---

## Alternative: Render.com for Backend

If you prefer Render over Railway:

### Render Free Tier
- 512 MB RAM
- Automatic HTTPS
- **Important**: Spins down after 15 min of inactivity (50s cold start)

### Deploy to Render

1. Go to [render.com](https://render.com/) and create account
2. Click "New +" → "Web Service"
3. Connect your GitHub repo (or use public repo)
4. Configure:
   - **Name**: mealplanner-backend
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: Your API key
6. Click "Create Web Service"

### Keep Render Awake (Optional)

If using Render's free tier, set up [UptimeRobot](https://uptimerobot.com/) (free) to ping your backend every 5 minutes and prevent spin-down:

1. Create UptimeRobot account
2. Add new monitor
3. Monitor Type: HTTP(s)
4. URL: Your Render backend URL + `/health` endpoint
5. Monitoring Interval: 5 minutes

---

## Comparison: Railway vs Render

| Feature | Railway | Render (Free) |
|---------|---------|---------------|
| **Spin-down** | Never | After 15 min |
| **Cold start** | None | ~50 seconds |
| **Free tier** | $5/month credit | 750 hrs/month |
| **Best for** | Active apps | Demos/side projects |

**Recommendation**: Use Railway for better performance and no cold starts.

---

## Production Considerations

- **Data Persistence:** The current setup uses local JSON files. For production, consider:
  - Moving to a proper database (PostgreSQL, MongoDB)
  - Using cloud storage for recipe data
  - Hosted Chroma DB or alternative vector database

- **API Keys:** Never commit API keys to Git. Always use environment variables.

- **Monitoring:** Set up logging and error tracking (Sentry, LogRocket)

- **Performance:** Consider caching for frequently accessed data
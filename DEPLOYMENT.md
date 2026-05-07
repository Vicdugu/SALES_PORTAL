# Vercel Deployment Guide

## Changes Made

✅ **Completed:**
- Prisma schema updated from SQLite to PostgreSQL
- Environment configuration files created (`.env.example`)
- `vercel.json` configuration created
- Build script updated to include Prisma migrations
- `better-sqlite3` dependency removed
- New npm scripts added for database management

## Next Steps

### 1. Push Changes to GitHub

```bash
git add .
git commit -m "Configure for Vercel deployment with PostgreSQL"
git push origin main
```

### 2. Set Up PostgreSQL Database

Choose one of these options:

#### Option A: Vercel Postgres (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database** → Select **Postgres**
5. Follow the prompts to create a PostgreSQL database
6. Copy the `DATABASE_URL` connection string

#### Option B: External PostgreSQL (Supabase, Railway, Neon, etc.)
1. Create a PostgreSQL database at your provider
2. Get the connection string (usually format: `postgresql://user:password@host:port/dbname`)

### 3. Migrate Data from SQLite (if needed)

Since you're migrating from SQLite to PostgreSQL:

1. **Export SQLite data** (if you have existing data):
   ```bash
   # Use a migration tool or manual SQL export
   # Example: sqlite3 sales-till.db ".dump" > backup.sql
   ```

2. **Create Prisma migration for new schema**:
   ```bash
   # Make sure DATABASE_URL is set to your PostgreSQL
   npm run prisma:migrate -- --name initial_schema
   ```

3. **Seed initial data** (if applicable):
   ```bash
   npm run db:seed
   ```

### 4. Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Generate a random secret | Use `openssl rand -hex 32` |
| `NEXTAUTH_SECRET` | Generate a random secret | Use `openssl rand -hex 32` |
| `NEXTAUTH_URL` | Your Vercel domain | `https://your-app.vercel.app` |
| `EMAIL_HOST` | SMTP server | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | Your email | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | App password | Get from email provider |
| `EMAIL_FROM` | From address | `noreply@yourdomain.com` |
| `NODE_ENV` | Environment | `production` |

**Generate secrets in PowerShell:**
```powershell
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
Write-Output $secret
```

### 5. Deploy to Vercel

#### Method 1: Deploy from GitHub (Recommended)
1. Push your changes to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **Import Project**
4. Select your repository
5. Configure build settings (should auto-detect Next.js)
6. Add environment variables from Step 4
7. Click **Deploy**

#### Method 2: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production
vercel --prod
```

### 6. Run Post-Deployment Setup

After deployment completes:

1. **Verify Prisma is initialized:**
   ```bash
   # This should be automatic, but if needed:
   npm run prisma:generate
   ```

2. **Check logs:**
   - Go to Vercel dashboard → Deployments
   - Click the latest deployment
   - Check **Function Logs** for any errors

3. **Test the application:**
   - Visit your Vercel URL
   - Test login, orders, inventory features
   - Check browser console for errors

### 7. Update Local Development (Optional)

If you want to continue developing locally with PostgreSQL:

```bash
# Install dependencies
npm install

# Update .env.local with PostgreSQL connection string
# DATABASE_URL=postgresql://localhost/sales_till

# Create/migrate database locally
npm run prisma:migrate

# Start development server
npm run dev
```

## Important Notes

### Socket.io Configuration
The current setup uses Socket.io for real-time features. Vercel has limitations:
- **Duration limits:** API routes timeout after 60 seconds (configured in `vercel.json`)
- **Serverless functions:** Can't maintain long-lived WebSocket connections
- **Recommended:** Use Vercel's Realtime API or a separate WebSocket service (e.g., Pusher, Socket.io adapter for serverless)

**To fix Socket.io for production:**
1. Consider using Pusher or similar service
2. Or set up a separate Node.js server for WebSocket connections
3. See [REALTIME_IMPLEMENTATION.md](./REALTIME_IMPLEMENTATION.md) for details

### Database Considerations
- **Connection pooling:** PostgreSQL connections are limited. For high traffic, enable connection pooling at your database provider
- **Backups:** Enable automatic backups for your PostgreSQL database
- **Monitoring:** Set up monitoring and alerts in Vercel dashboard

### Email Configuration
- Gmail requires "App Passwords" for SMTP access
- Other providers may require different setup
- Test email sending after deployment

## Troubleshooting

### "DATABASE_URL not found" error
- Check environment variables are set in Vercel dashboard
- Redeploy after adding variables

### Prisma migration fails
- Check DATABASE_URL is valid and accessible
- Verify PostgreSQL database exists
- Check migration files in `prisma/migrations/`

### Build fails
- Check Node version (Should be 18+)
- Verify all dependencies installed: `npm install`
- Check for TypeScript errors: `npx tsc --noEmit`

### Application running but features not working
- Check API logs in Vercel dashboard
- Verify environment variables are correct
- Check database connectivity with: `npm run prisma:studio`

## Rollback

If you need to rollback to SQLite locally:

1. Update `prisma/schema.prisma` datasource back to SQLite
2. Delete migrations: `rm -r prisma/migrations/*`
3. Reinstall better-sqlite3: `npm install better-sqlite3`
4. Reset database: `npm run prisma:migrate:reset`

## Additional Resources

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma Deployment Guide](https://www.prisma.io/docs/orm/prisma-client/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)

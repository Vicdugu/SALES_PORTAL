# Vercel Environment Setup Script
# This script will add all required environment variables to your Vercel project

# ✅ Already set automatically by Neon:
# - DATABASE_URL
# - POSTGRES_PRISMA_URL
# - And other Neon-related variables

# ⭐ Required environment variables to add:
# JWT_SECRET - Your JWT signing key
# NEXTAUTH_SECRET - NextAuth session secret  
# NEXTAUTH_URL - Your Vercel domain (e.g., https://sales-portal.vercel.app)
# NODE_ENV - Set to "production"

# 📧 Optional email variables (add if needed for email notifications):
# EMAIL_HOST - SMTP server host
# EMAIL_PORT - SMTP server port  
# EMAIL_USER - SMTP username
# EMAIL_PASSWORD - SMTP password
# EMAIL_FROM - From email address

# Usage Instructions:
# 1. Generate secrets (see below)
# 2. Go to Vercel Dashboard → sales-portal → Settings → Environment Variables
# 3. Add each variable manually OR run vercel env pull && vercel env push commands

# Generate secure secrets (run in PowerShell):
# $secret1 = [System.Guid]::NewGuid().ToString().Replace('-','') + [System.Guid]::NewGuid().ToString().Replace('-','')
# $secret2 = [System.Guid]::NewGuid().ToString().Replace('-','') + [System.Guid]::NewGuid().ToString().Replace('-','')
# Write-Host "JWT_SECRET: $secret1"
# Write-Host "NEXTAUTH_SECRET: $secret2"

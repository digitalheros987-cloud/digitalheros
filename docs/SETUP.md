# Database & Project Setup Guide

This guide explains how to initialize the Digital Heroes project locally for development.

## 1. Supabase Project Setup
1. Create a new project in your Supabase dashboard (or use the local Supabase CLI: `supabase init` then `supabase start`).
2. If using the hosted version, note your Project URL and Anon Key from **Project Settings -> API**.
3. Note your Service Role Key for server-side admin tasks.

## 2. Apply Migrations
The database schema and Row Level Security (RLS) policies are fully version-controlled.
To apply them to your database, you can use the Supabase CLI:
```bash
supabase db push
```
Or, if running a local instance:
```bash
supabase migration up
```
*Note: This creates all necessary tables, types, constraints, and RLS policies from a clean slate.*

## 3. Configure Environment Variables
Copy `.env.example` to `.env.local` and populate the values:
```bash
cp .env.example .env.local
```
Fill in the Stripe keys from your Stripe Developer Dashboard and the Supabase keys from Step 1.

## 4. Run the Application
Install dependencies if you haven't already:
```bash
npm install
```
Start the Next.js development server:
```bash
npm run dev
```

## 5. Reset / Reseed Development Database
To completely wipe your local development database and re-apply migrations:
```bash
supabase db reset
```
*(Optional)* If seed data is required in the future, it will be placed in `supabase/seed.sql` and automatically applied upon reset.

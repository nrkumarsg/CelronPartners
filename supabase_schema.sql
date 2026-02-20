-- Run this entirely in the Supabase SQL Editor

-- Create Partners Table
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  types text[] DEFAULT '{}'::text[],
  others text,
  name text NOT NULL,
  address text,
  country text,
  email1 text,
  email2 text,
  phone1 text,
  phone2 text,
  weblink text,
  info text,
  "customerCredit" text,
  "supplierCredit" text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "partnerId" uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  post text,
  address text,
  email text,
  phone text,
  handphone text,
  facebook text,
  info text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) but allow all operations for this demo
-- In a real production app, restrict these policies using auth.uid()
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access on partners" ON public.partners FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on partners" ON public.partners FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on partners" ON public.partners FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on partners" ON public.partners FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on contacts" ON public.contacts FOR DELETE USING (true);

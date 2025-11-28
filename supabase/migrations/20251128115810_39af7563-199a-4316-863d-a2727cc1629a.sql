-- Add favorite_models column to profiles table to store user's favorite model IDs
ALTER TABLE public.profiles 
ADD COLUMN favorite_models jsonb DEFAULT '[]'::jsonb;
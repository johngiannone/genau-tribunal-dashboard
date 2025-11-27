-- Add context column to conversations table to persist document analysis
ALTER TABLE public.conversations 
ADD COLUMN context text;
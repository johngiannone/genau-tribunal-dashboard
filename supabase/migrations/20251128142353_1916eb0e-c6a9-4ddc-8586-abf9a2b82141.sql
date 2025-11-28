-- Create training_dataset table for collecting audit results
CREATE TABLE public.training_dataset (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  chosen_response TEXT NOT NULL,
  rejected_response_a TEXT NOT NULL,
  rejected_response_b TEXT NOT NULL,
  model_config JSONB NOT NULL,
  human_rating INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.training_dataset ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own training data" 
ON public.training_dataset 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training data" 
ON public.training_dataset 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training data" 
ON public.training_dataset 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training data" 
ON public.training_dataset 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_training_dataset_user_id ON public.training_dataset(user_id);
CREATE INDEX idx_training_dataset_created_at ON public.training_dataset(created_at DESC);

-- Add trigger for updating updated_at
CREATE TRIGGER update_training_dataset_updated_at
BEFORE UPDATE ON public.training_dataset
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
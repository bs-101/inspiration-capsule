-- Create inspirations table
CREATE TABLE IF NOT EXISTS inspirations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  status TEXT DEFAULT 'private' CHECK (status IN ('private', 'public')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE inspirations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own inspirations
CREATE POLICY "Users can view their own inspirations" ON inspirations
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own inspirations
CREATE POLICY "Users can insert their own inspirations" ON inspirations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own inspirations
CREATE POLICY "Users can update their own inspirations" ON inspirations
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for users to delete their own inspirations
CREATE POLICY "Users can delete their own inspirations" ON inspirations
  FOR DELETE USING (auth.uid() = user_id);

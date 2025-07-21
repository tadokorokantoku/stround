-- Create categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_tracks table
CREATE TABLE user_tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  spotify_track_id TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_user_tracks_user_id ON user_tracks(user_id);
CREATE INDEX idx_user_tracks_category_id ON user_tracks(category_id);
CREATE INDEX idx_user_tracks_created_at ON user_tracks(created_at DESC);
CREATE INDEX idx_categories_name ON categories(name);

-- Insert default categories
INSERT INTO categories (name, description, is_default) VALUES
('美しい曲', '最も美しいと思う楽曲', true),
('学生時代の曲', '学生時代によく聴いた楽曲', true),
('ドライブ用', 'ドライブ中に流したい楽曲', true),
('仕事中に聴く曲', '仕事中によく聞く楽曲', true),
('切ない系', '切ない気持ちになる楽曲', true),
('テンション上がる曲', 'テンションが上がる楽曲', true);
-- SQL for Release Notes and User Notifications

-- Table for Release Notes
CREATE TABLE IF NOT EXISTS release_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    changes JSONB DEFAULT '[]'::jsonb,
    publish_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT CHECK (type IN ('improvement', 'fix', 'security', 'feature')) DEFAULT 'improvement',
    is_visible BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking read notifications per user
CREATE TABLE IF NOT EXISTS user_release_reads (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    release_id UUID REFERENCES release_notes(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, release_id)
);

-- RLS Policies for release_notes
ALTER TABLE release_notes ENABLE ROW LEVEL SECURITY;

-- Everyone can read visible release notes
CREATE POLICY "Public can read visible release notes" ON release_notes
    FOR SELECT
    USING (is_visible = TRUE);

-- Only admins can do everything else
-- Note: Assuming there is a column 'role' in profiles.
CREATE POLICY "Admins have full access to release notes" ON release_notes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for user_release_reads
ALTER TABLE user_release_reads ENABLE ROW LEVEL SECURITY;

-- Users can read their own read records
CREATE POLICY "Users can read their own release reads" ON user_release_reads
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own read records
CREATE POLICY "Users can insert their own release reads" ON user_release_reads
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_release_notes_updated_at
    BEFORE UPDATE ON release_notes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- FAMILY MEAL CALENDAR - Database Schema (Supabase/PostgreSQL)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (local authentication)
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FAMILIES
-- ============================================================
CREATE TABLE families (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FAMILY MEMBERS (junction table)
-- ============================================================
CREATE TABLE family_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  color       TEXT, -- hex color for calendar display
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, profile_id)
);

-- ============================================================
-- WEEKLY MENUS (each week has a start date)
-- ============================================================
CREATE TABLE weekly_menus (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL, -- Monday of the week
  week_end    DATE NOT NULL, -- Sunday of the week
  notes       TEXT,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, week_start)
);

-- ============================================================
-- MEALS (individual meal entries)
-- ============================================================
CREATE TABLE meals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_menu_id UUID NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon, 6=Sun
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  title         TEXT NOT NULL,
  description   TEXT,
  notes         TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(weekly_menu_id, day_of_week, meal_type)
);

-- ============================================================
-- RECIPES (shared within a family)
-- ============================================================
CREATE TABLE recipes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[],
  instructions TEXT,
  link        TEXT,
  image_url   TEXT,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MEAL RECIPES (junction table)
-- ============================================================
CREATE TABLE meal_recipes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id   UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  UNIQUE(meal_id, recipe_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_profile ON family_members(profile_id);
CREATE INDEX idx_weekly_menus_family ON weekly_menus(family_id);
CREATE INDEX idx_weekly_menus_dates ON weekly_menus(week_start, week_end);
CREATE INDEX idx_meals_menu ON meals(weekly_menu_id);
CREATE INDEX idx_recipes_family ON recipes(family_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles: users can read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Families: members can read their families
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view their families"
  ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
        AND family_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their families"
  ON families FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
        AND family_members.profile_id = auth.uid()
        AND family_members.role = 'admin'
    )
  );

-- Family Members: users can see members of their families
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view all members"
  ON family_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members AS fm
      WHERE fm.family_id = family_members.family_id
        AND fm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves"
  ON family_members FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Weekly Menus
ALTER TABLE weekly_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view menus"
  ON weekly_menus FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = weekly_menus.family_id
        AND family_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Family members can insert menus"
  ON weekly_menus FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = weekly_menus.family_id
        AND family_members.profile_id = auth.uid()
        AND family_members.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Family members can update menus"
  ON weekly_menus FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = weekly_menus.family_id
        AND family_members.profile_id = auth.uid()
        AND family_members.role IN ('admin', 'member')
    )
  );

-- Meals
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view meals"
  ON meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_menus
      JOIN family_members ON family_members.family_id = weekly_menus.family_id
      WHERE weekly_menus.id = meals.weekly_menu_id
        AND family_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage meals"
  ON meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_menus
      JOIN family_members ON family_members.family_id = weekly_menus.family_id
      WHERE weekly_menus.id = meals.weekly_menu_id
        AND family_members.profile_id = auth.uid()
        AND family_members.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Family members can update meals"
  ON meals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_menus
      JOIN family_members ON family_members.family_id = weekly_menus.family_id
      WHERE weekly_menus.id = meals.weekly_menu_id
        AND family_members.profile_id = auth.uid()
        AND family_members.role IN ('admin', 'member')
    )
  );

-- Recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view recipes"
  ON recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = recipes.family_id
        AND family_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Family members can create recipes"
  ON recipes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = recipes.family_id
        AND family_members.profile_id = auth.uid()
        AND family_members.role IN ('admin', 'member')
    )
  );

-- ============================================================
-- TRIGGERS (auto-update updated_at)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_weekly_menus_updated_at
  BEFORE UPDATE ON weekly_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
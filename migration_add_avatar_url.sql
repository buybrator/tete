-- 프로필 테이블에 avatar_url 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

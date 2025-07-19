-- Supabase安全修复方案
-- 修复search_path安全问题和设置RLS策略

-- ===============================
-- 1. 修复函数的search_path安全问题
-- ===============================

-- 创建安全的用户ID设置函数
CREATE OR REPLACE FUNCTION public.set_user_id(user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 设置当前会话的用户ID
    PERFORM set_config('app.current_user_id', user_id, false);
END;
$$;

-- 创建安全的用户ID获取函数
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 获取当前会话的用户ID
    RETURN current_setting('app.current_user_id', true);
END;
$$;

-- 创建安全的updated_at更新函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ===============================
-- 2. 启用RLS并设置策略
-- ===============================

-- 启用tags表的RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- 启用prompts表的RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- ===============================
-- 3. Tags表的RLS策略
-- ===============================

-- Tags表：允许所有认证用户查看
CREATE POLICY "tags_select_policy" ON public.tags
    FOR SELECT
    TO authenticated
    USING (true);

-- Tags表：允许认证用户插入新标签
CREATE POLICY "tags_insert_policy" ON public.tags
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Tags表：不允许更新和删除（保持标签稳定性）
-- 如果需要更新/删除权限，可以添加以下策略：
-- CREATE POLICY "tags_update_policy" ON public.tags
--     FOR UPDATE
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);

-- CREATE POLICY "tags_delete_policy" ON public.tags
--     FOR DELETE
--     TO authenticated
--     USING (true);

-- ===============================
-- 4. Prompts表的RLS策略
-- ===============================

-- Prompts表：查看策略 - 用户只能查看自己的prompt或公开的prompt
CREATE POLICY "prompts_select_policy" ON public.prompts
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()::text 
        OR is_public = true
    );

-- Prompts表：插入策略 - 用户只能插入自己的prompt
CREATE POLICY "prompts_insert_policy" ON public.prompts
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

-- Prompts表：更新策略 - 用户只能更新自己的prompt
CREATE POLICY "prompts_update_policy" ON public.prompts
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- Prompts表：删除策略 - 用户只能删除自己的prompt
CREATE POLICY "prompts_delete_policy" ON public.prompts
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()::text);

-- ===============================
-- 5. 额外安全措施
-- ===============================

-- 创建用于公开分享的安全视图
CREATE OR REPLACE VIEW public.public_prompts AS
SELECT 
    id,
    title,
    content,
    description,
    created_at,
    updated_at,
    version,
    tags,
    cover_img
FROM public.prompts
WHERE is_public = true;

-- 为公开视图设置安全策略
ALTER VIEW public.public_prompts SET (security_barrier = true);

-- 授予anonymous用户查看公开prompts的权限
GRANT SELECT ON public.public_prompts TO anon;

-- ===============================
-- 6. 索引优化（提升RLS性能）
-- ===============================

-- 为user_id创建索引以提升RLS查询性能
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON public.prompts(user_id);

-- 为is_public创建索引
CREATE INDEX IF NOT EXISTS idx_prompts_is_public ON public.prompts(is_public);

-- 为复合查询创建索引
CREATE INDEX IF NOT EXISTS idx_prompts_user_public ON public.prompts(user_id, is_public);

-- ===============================
-- 7. 函数权限设置
-- ===============================

-- 撤销public角色对敏感函数的执行权限
REVOKE EXECUTE ON FUNCTION public.set_user_id(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_current_user_id() FROM public;

-- 仅授予authenticated用户权限
GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated;

-- ===============================
-- 8. 验证设置
-- ===============================

-- 检查RLS状态
DO $$
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'tags') THEN
        RAISE EXCEPTION 'RLS未在tags表上启用';
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'prompts') THEN
        RAISE EXCEPTION 'RLS未在prompts表上启用';
    END IF;
    
    RAISE NOTICE '✓ RLS已成功启用在所有表上';
END $$;
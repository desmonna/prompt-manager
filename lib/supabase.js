import { createClient } from '@supabase/supabase-js';

// 创建匿名客户端（用于公共访问）
export const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 创建服务端客户端（绕过RLS，用于管理员操作）
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 创建带用户上下文的客户端
export function createUserSupabaseClient(userId) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          'X-User-ID': userId // 自定义头部传递用户ID
        }
      }
    }
  );
  
  return supabase;
}
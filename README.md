# PromptManager

一个简洁、美观、实用的提示词管理网站。


## 特性

- 简洁美观的界面设计
- 完全开源，可以自行部署和修改
- 支持提示词标签
- 支持提示词版本管理
- 移动端适配
- 简化的登录系统，使用毫无压力

## 技术栈

- Next.js 14
- Tailwind CSS
- Lucide
- Shadcn/UI
- 数据库：Supabase
- 用户认证：Clerk

## 部署流程

### vercel

1. fork本项目
2. 注册并登录vercel
3. 点击`New Project`
4. 选择`Import Git Repository`
5. 输入项目名称，选择`GitHub`作为代码来源
6. 设置相关环境变量（clerk部分先输入Development环境的key，获取方式和production一样）
7. 修改next.config.mjs和
8. 点击`Deploy`

#### 环境变量说明

- `SUPABASE_URL`：Supabase 项目 URL
- `SUPABASE_ANON_KEY`：Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 核心密钥
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`：Clerk 公钥，用于客户端认证
- `CLERK_SECRET_KEY`：Clerk 私钥，用于服务端认证
- `NEXT_PUBLIC_CLERK_DOMAIN`：你的域名
- `AUTH_SECRET`：用于 NextAuth.js 的加密密钥
- `GITHUB_ID`：GitHub OAuth 应用的客户端 ID（可选，用于 GitHub 登录）
- `GITHUB_SECRET`：GitHub OAuth 应用的客户端密钥（可选，用于 GitHub 登录）

### supabase

1. 注册supabase账号并创建项目
2. 创建数据表：
   - 目仪表盘的左侧菜单中，找到并点击 `SQL Editor`，点击 `New query`。
   - 将下面的 SQL 代码复制并粘贴进去，然后点击 `RUN` 来创建 `prompts` 和 `tags` 这两个表。
```
  -- 1. 创建原有表结构
  CREATE TABLE tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE prompts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      is_public BOOLEAN DEFAULT false,
      user_id TEXT NOT NULL,
      version TEXT DEFAULT '1.0',
      tags TEXT,
      cover_img TEXT
  );

  -- 创建更新触发器
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$ language 'plpgsql';

  CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE
      ON prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- 2. 添加性能优化索引
  CREATE INDEX idx_prompts_user_id ON prompts(user_id);
  CREATE INDEX idx_prompts_is_public ON prompts(is_public);
  CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);
  CREATE INDEX idx_tags_name ON tags(name);

  -- 3. 启用RLS (Row Level Security)
  ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
  ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

  -- 4. Tags表RLS策略
  -- 所有人可以读取标签
  CREATE POLICY "tags_select_policy" ON tags
      FOR SELECT USING (true);

  -- 认证用户可以创建标签
  CREATE POLICY "tags_insert_policy" ON tags
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');

  -- 只有管理员可以更新/删除标签
  CREATE POLICY "tags_update_policy" ON tags
      FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

  CREATE POLICY "tags_delete_policy" ON tags
      FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

  -- 5. Prompts表RLS策略
  -- 查看策略：用户可以看到自己的所有prompts + 其他用户的公开prompts
  CREATE POLICY "prompts_select_policy" ON prompts
      FOR SELECT USING (
          user_id = auth.uid()::text OR is_public = true
      );

  -- 插入策略：认证用户可以创建prompts，user_id自动设置
  CREATE POLICY "prompts_insert_policy" ON prompts
      FOR INSERT WITH CHECK (
          auth.role() = 'authenticated' AND user_id = auth.uid()::text
      );

  -- 更新策略：只能更新自己的prompts
  CREATE POLICY "prompts_update_policy" ON prompts
      FOR UPDATE USING (user_id = auth.uid()::text);

  -- 删除策略：只能删除自己的prompts
  CREATE POLICY "prompts_delete_policy" ON prompts
      FOR DELETE USING (user_id = auth.uid()::text);
  -- 插入示例数据
  INSERT INTO tags (name) VALUES
      ('AI助手'), ('编程'), ('写作'), ('翻译'), ('分析');     
```
3. 创建`bucket`:
   - 在左侧菜单中，点击 `Storage`。
   - 点击 `Create bucket`，创建一个新的存储桶，用于存放提示词的封面图片。
```
  -- 6. 创建Storage Bucket（需要在Supabase Dashboard中执行或使用客户端代码）
  -- 这里提供SQL函数来管理bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
      'prompt-covers',
      'prompt-covers',
      false,  -- 私有bucket，通过策略控制访问
      5242880,  -- 5MB限制
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  );

  -- 7. Storage策略配置
  -- 上传策略：认证用户可以上传到自己的文件夹
  CREATE POLICY "prompt_covers_upload_policy" ON storage.objects
      FOR INSERT WITH CHECK (
          bucket_id = 'prompt-covers' AND
          auth.role() = 'authenticated' AND
          (storage.foldername(name))[1] = auth.uid()::text
      );

  -- 查看策略：可以访问公开prompts的图片 + 自己的图片
  CREATE POLICY "prompt_covers_select_policy" ON storage.objects
      FOR SELECT USING (
          bucket_id = 'prompt-covers' AND (
              -- 自己的图片
              (storage.foldername(name))[1] = auth.uid()::text OR
              -- 公开prompts的图片
              EXISTS (
                  SELECT 1 FROM prompts
                  WHERE prompts.cover_img = storage.objects.name
                  AND prompts.is_public = true
              )
          )
      );

  -- 更新策略：只能更新自己的图片
  CREATE POLICY "prompt_covers_update_policy" ON storage.objects
      FOR UPDATE USING (
          bucket_id = 'prompt-covers' AND
          (storage.foldername(name))[1] = auth.uid()::text
      );

  -- 删除策略：只能删除自己的图片
  CREATE POLICY "prompt_covers_delete_policy" ON storage.objects
      FOR DELETE USING (
          bucket_id = 'prompt-covers' AND
          (storage.foldername(name))[1] = auth.uid()::text
      );

-- 允许公共读取访问策略
CREATE POLICY "Public Access" ON storage.objects FOR SELECT 
USING (bucket_id = 'prompt-covers');

-- 设置bucket为公共访问
UPDATE storage.buckets SET public = true WHERE id = 'prompt-covers';

  -- 8. 实用函数：获取图片完整URL
  CREATE OR REPLACE FUNCTION get_cover_image_url(image_path TEXT)
  RETURNS TEXT AS $$
  BEGIN
      IF image_path IS NULL OR image_path = '' THEN
          RETURN NULL;
      END IF;

      -- 返回Supabase Storage的完整URL
      -- 需要替换YOUR_SUPABASE_URL为实际的Supabase项目URL
      RETURN 'https://YOUR_SUPABASE_URL.supabase.co/storage/v1/object/public/prompt-covers/' || image_path;
  END;
  $$ LANGUAGE plpgsql;

  -- 9. 清理函数：删除prompt时清理对应图片
  CREATE OR REPLACE FUNCTION cleanup_prompt_cover()
  RETURNS TRIGGER AS $$
  BEGIN
      -- 删除Storage中的图片文件
      IF OLD.cover_img IS NOT NULL AND OLD.cover_img != '' THEN
          DELETE FROM storage.objects
          WHERE bucket_id = 'prompt-covers'
          AND name = OLD.cover_img;
      END IF;
      RETURN OLD;
  END;
  $$ LANGUAGE plpgsql;

  -- 创建触发器，在删除prompt时自动清理图片
  CREATE TRIGGER cleanup_prompt_cover_trigger
      BEFORE DELETE ON prompts
      FOR EACH ROW EXECUTE FUNCTION cleanup_prompt_cover();
```
4. 左侧菜单底部，点击 `Project Settings` -> `API`
   - 在这里你会找到两个关键信息，请复制并填入vercel的环境变量中：
   - `Project URL (SUPABASE_URL)`
   - `Project API keys` 下的 `anon public` 密钥 `(SUPABASE_ANON_KEY)`


### clerk

1. 前往 Clerk 官网注册并登录,根据引导创建一个新的应用,如 `My Prompt Manager`。。
2. 配置登录方式：
   - Clerk 会让你选择用户如何登录。建议至少勾选 Email address
   - 你也可以根据喜好添加社交登录，例如 Google 或 GitHub
   - 完成选择后，点击 "Create application"
3. 换到 Production 实例:
   - 现在应用处于 Development 模式，右上角下拉切换到 Production
   - 输入你的 Vercel 部署后的主域名（等vercel绑定自定义域名再继续，clerk不支持vercel的preview域名）
4. Production 实例的 API Keys：
   - 左侧菜单中，点击 "API Keys"
   - 你现在看到的 `Publishable key` 和 `Secret key` 就是你真正需要的密钥。
   - Publishable key：以 `pk_live_ `开头。
   - Secret key：以 `sk_live_` 开头。
5.配置 JWT Template for Supabase (重要！)
   - 在 Clerk Production 实例的左侧菜单中，找到并点击 "JWT Templates"。
   - 点击 "+ New template"。
   - 在预设模板中，选择 Supabase。点击 "Apply changes" 保存。
   - 保存后，模板页面会显示一个 Issuer URL。这个 URL 对 Supabase 很重要，但是通过 Clerk 的 SDK 内部处理，你只需要确保创建了这个 Supabase 模板即可。

### vercel续
1.Vercel 中添加你的自定义域名（免费的三级域名不支持，会要求你验证二级域名）：
   - 进入你的 prompt-manager 项目仪表盘。点击顶部的 "Settings" 选项卡。
   - 在左侧菜单中，选择 "Domains"。在输入框中，输入你想要使用的域名，然后点击 "Add"
2. 在你的域名注册商处配置 DNS：
   - Vercel 添加域名后，会为你提供需要配置的 DNS 记录
   - A Record (推荐用于根域名，如 `yourdomain.com`): Vercel 会提供一个 IP 地址，你需要去你的域名注册商的 DNS 管理后台，添加一条 A 记录，指向这个 IP 地址。
   - CNAME Record (推荐用于子域名，如 `www.yourdomain.com`): Vercel 会提供一个地址（通常是 cname.vercel-dns.com），你需要去 DNS 管理后台，添加一条 CNAME 记录，指向 Vercel 提供的这个地址。
   - 等待 DNS 生效：你可以在 Vercel 的 Domains 页面看到域名的状态，当它显示为 "Valid Configuration" 时，就表示配置成功了。
3. 更新 Clerk 的配置
   -  Clerk Production 实例的仪表盘。在configure页面中，左侧菜单选择`Domains`。
   -  和vercel一样，注册好DNS。DNS Configuration显示绿色的`Verified`，就代表完成了。
4. 重新部署 Vercel 项目
回到Vercel，为你的项目触发一次重新部署 (Redeploy)，以确保所有服务都使用你最新的自定义域名进行通信。

### 自此全部完成！
### 额外教学：github登录验证
1. 登录你的 GitHub 账号。进入开发者设置。
2. 点击右上角的你的头像，选择 "Settings"
   - 在左侧菜单中，滚动到底部，选择 "Developer settings"。
   - 选择 OAuth Apps：
   - 点击 "New OAuth App" 按钮。
3. 填写 OAuth App 信息（这是最关键的一步！）：
   - Application name (应用名称):
   - Homepage URL (主页URL):必须填写你完整的、生产环境的域名。
   - Application description (应用描述):选填。可以写一句简单描述，比如 "Login for the application."
   - Authorization callback URL (授权回调URL):这是最最最重要的一项！ 当用户在GitHub上授权后，GitHub需要知道把用户送回到哪里。这个地址由Clerk提供。
   - 打开Clerk Dashboard，进入你的生产实例，点击左侧的 "User & Authentication" -> "Social Connections"。找到 GitHub 并点击它。
   - 在弹出的配置页面中，你会看到"Callback URL"，完整地复制这个URL，然后回到 GitHub 的页面，把它粘贴到 "Authorization callback URL" 的输入框里。
   - Account permissions里面选择Email addresses:read-noly，Profile:Read and Write，然后直接下拉到最下方，点击 "Register application" 按钮。
   - 页面会刷新，现在你会看到你的应用的详情页。这里面包含了我们需要的第一个关键信息：Client ID。
   - 点击 "Generate a new client secret" 按钮。GitHub会要求你再次确认密码。确认后，它会生成一长串字符，这就是你的 Client Secret。
注意：这个 Client Secret 只会显示一次！ 请立即将 Client ID 和 Client Secret 复制到一个安全的地方（比如一个临时的记事本文件），我们马上就要用到它们。
4. 在 Clerk 中配置
   - 回到你刚才打开的 Clerk Dashboard (User & Authentication -> Social Connections -> GitHub)。
   - 启用并填写凭证：确保顶部的 "Status" 开关是打开 (Enabled) 的。
   - Client ID: 将你从 GitHub 复制的 Client ID 粘贴到这里。
   - Client Secret: 将你从 GitHub 复制的 Client Secret 粘贴到这里。
   - Scopes (授权范围): 保持默认的 user:email 就好。这代表你请求GitHub提供用户的邮箱地址，这是登录所必需的。
   - 保存更改：点击右下角的 "Save" 按钮。

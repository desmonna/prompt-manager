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
6. 点击`Deploy`

#### 环境变量说明

- `SUPABASE_URL`：Supabase 项目 URL
- `SUPABASE_ANON_KEY`：Supabase 匿名密钥
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`：Clerk 公钥，用于客户端认证
- `CLERK_SECRET_KEY`：Clerk 私钥，用于服务端认证
- `AUTH_SECRET`：用于 NextAuth.js 的加密密钥
- `GITHUB_ID`：GitHub OAuth 应用的客户端 ID（可选，用于 GitHub 登录）
- `GITHUB_SECRET`：GitHub OAuth 应用的客户端密钥（可选，用于 GitHub 登录）

### supabase

1. 注册supabase账号并创建项目
2. 进入项目设置，点击`Service Role`，点击`Generate new key`，复制key
3. 将key填入vercel的环境变量中
4. 进入项目设置，点击`Database`，点击`Create new database`，创建数据库
5. 创建数据表
```
     -- 创建 tags 表
     CREATE TABLE tags (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         name TEXT NOT NULL UNIQUE,
         created_at TIMESTAMPTZ DEFAULT NOW()
     );

     -- 创建 prompts 表  
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

     -- 插入一些示例标签
     INSERT INTO tags (name) VALUES
     ('AI助手'), ('编程'), ('写作'), ('翻译'), ('分析');
```
6. 创建bucket，用于存储封面图片
进入项目设置，点击`Storage`，点击`Create bucket`，创建bucket


### clerk
配置非常简单，按照流程一步步来就行，这里不做详细说明。

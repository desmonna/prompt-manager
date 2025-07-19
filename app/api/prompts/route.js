    import { NextResponse } from 'next/server';
     import { auth } from '@clerk/nextjs';
     import { createClient } from '@supabase/supabase-js';

     const supabase = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_ANON_KEY
     );

     export async function POST(request) {
       try {
         const { userId } = auth();
         if (!userId) {
           return NextResponse.json({ error: '未授权访问' }, { status: 401 });
         }

         const body = await request.json();
         const { title, content, description, is_public, tags, cover_img, category } = body;

         // 验证必填字段
         if (!title || !content) {
           return NextResponse.json({
             error: '标题和内容为必填字段'
           }, { status: 400 });
         }

         // 插入prompt数据
         const { data, error } = await supabase
           .from('prompts')
           .insert({
             title: title.trim(),
             content: content.trim(),
             description: description?.trim() || '',
             is_public: is_public || false,
             user_id: userId, // 使用Clerk用户ID
             tags: tags || [],
             cover_img: cover_img || '',
             category: category || 'general'
           })
           .select('*')
           .single();

         if (error) {
           console.error('创建prompt失败:', error);
           return NextResponse.json({
             error: '创建失败: ' + error.message
           }, { status: 500 });
         }

         return NextResponse.json({
           success: true,
           data: data
         }, { status: 201 });

       } catch (error) {
         console.error('API错误:', error);
         return NextResponse.json({
           error: '服务器内部错误: ' + error.message
         }, { status: 500 });
       }
     }

     export async function GET(request) {
       try {
         const { userId } = auth();
         const { searchParams } = new URL(request.url);
         const publicOnly = searchParams.get('public') === 'true';
         const category = searchParams.get('category');
         const search = searchParams.get('search');

         let query = supabase
           .from('prompts')
           .select('*')
           .order('created_at', { ascending: false });

         // 权限过滤
         if (publicOnly) {
           query = query.eq('is_public', true);
         } else if (userId) {
           query = query.or(`user_id.eq.${userId},is_public.eq.true`);
         } else {
           query = query.eq('is_public', true);
         }

         // 分类过滤
         if (category && category !== 'all') {
           query = query.eq('category', category);
         }

         // 搜索过滤
         if (search) {
           query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
         }

         const { data, error } = await query;

         if (error) {
           console.error('获取prompts失败:', error);
           return NextResponse.json({
             error: '获取数据失败: ' + error.message
           }, { status: 500 });
         }

         return NextResponse.json({
           success: true,
           data: data || []
         });

       } catch (error) {
         console.error('API错误:', error);
         return NextResponse.json({
           error: '服务器内部错误: ' + error.message
         }, { status: 500 });
       }
     }

     export async function PUT(request) {
       try {
         const { userId } = auth();
         if (!userId) {
           return NextResponse.json({ error: '未授权访问' }, { status: 401 });
         }

         const body = await request.json();
         const { id, title, content, description, is_public, tags, cover_img, category } = body;

         if (!id) {
           return NextResponse.json({ error: 'ID为必填字段' }, { status: 400 });
         }

         // 验证用户权限
         const { data: existingPrompt, error: checkError } = await supabase
           .from('prompts')
           .select('user_id')
           .eq('id', id)
           .single();

         if (checkError) {
           return NextResponse.json({
             error: '未找到该prompt'
           }, { status: 404 });
         }

         if (existingPrompt.user_id !== userId) {
           return NextResponse.json({
             error: '无权限修改此prompt'
           }, { status: 403 });
         }

         // 更新数据
         const { data, error } = await supabase
           .from('prompts')
           .update({
             title: title?.trim(),
             content: content?.trim(),
             description: description?.trim(),
             is_public: is_public,
             tags: tags,
             cover_img: cover_img,
             category: category
           })
           .eq('id', id)
           .select('*')
           .single();

         if (error) {
           console.error('更新prompt失败:', error);
           return NextResponse.json({
             error: '更新失败: ' + error.message
           }, { status: 500 });
         }

         return NextResponse.json({
           success: true,
           data: data
         });

       } catch (error) {
         console.error('API错误:', error);
         return NextResponse.json({
           error: '服务器内部错误: ' + error.message
         }, { status: 500 });
       }
     }

     export async function DELETE(request) {
       try {
         const { userId } = auth();
         if (!userId) {
           return NextResponse.json({ error: '未授权访问' }, { status: 401 });
         }

         const { searchParams } = new URL(request.url);
         const id = searchParams.get('id');

         if (!id) {
           return NextResponse.json({ error: 'ID为必填参数' }, { status: 400 });
         }

         // 验证用户权限并删除
         const { data, error } = await supabase
           .from('prompts')
           .delete()
           .eq('id', id)
           .eq('user_id', userId) // 确保只能删除自己的prompt
           .select('*')
           .single();

         if (error) {
           console.error('删除prompt失败:', error);
           return NextResponse.json({
             error: '删除失败: ' + error.message
           }, { status: 500 });
         }

         if (!data) {
           return NextResponse.json({
             error: '未找到该prompt或无权限删除'
           }, { status: 404 });
         }

         return NextResponse.json({
           success: true,
           message: '删除成功'
         });

       } catch (error) {
         console.error('API错误:', error);
         return NextResponse.json({
           error: '服务器内部错误: ' + error.message
         }, { status: 500 });
       }
     }

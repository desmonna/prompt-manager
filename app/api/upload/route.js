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

         const formData = await request.formData();
         const file = formData.get('file');

         if (!file) {
           return NextResponse.json({ error: '未选择文件' }, { status: 400 });
         }

         // 验证文件类型
         const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
         if (!allowedTypes.includes(file.type)) {
           return NextResponse.json({
             error: '不支持的文件类型，仅支持: JPEG, PNG, GIF, WebP'
           }, { status: 400 });
         }

         // 验证文件大小 (50MB)
         const maxSize = 50 * 1024 * 1024;
         if (file.size > maxSize) {
           return NextResponse.json({
             error: '文件大小超过限制，最大支持50MB'
           }, { status: 400 });
         }

         // 生成安全的文件名，包含用户ID用于权限控制
         const timestamp = Date.now();
         const fileExtension = file.name.split('.').pop();
         const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
         const filePath = `${userId}/${timestamp}_${sanitizedName}`;

         // 上传文件到Supabase Storage
         const { data, error } = await supabase.storage
           .from('prompt-manager')
           .upload(filePath, file, {
             cacheControl: '3600',
             upsert: false
           });

         if (error) {
           console.error('文件上传失败:', error);
           return NextResponse.json({
             error: '上传失败: ' + error.message
           }, { status: 500 });
         }

         // 获取公开访问URL
         const { data: urlData } = supabase.storage
           .from('prompt-manager')
           .getPublicUrl(data.path);

         return NextResponse.json({
           success: true,
           data: {
             path: data.path,
             url: urlData.publicUrl,
             size: file.size,
             type: file.type,
             name: file.name
           }
         }, { status: 201 });

       } catch (error) {
         console.error('上传API错误:', error);
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
         const filePath = searchParams.get('path');

         if (!filePath) {
           return NextResponse.json({ error: '文件路径为必填参数' }, { status: 400 });
         }

         // 验证用户权限 - 确保文件路径以用户ID开头
         if (!filePath.startsWith(userId + '/')) {
           return NextResponse.json({
             error: '无权限删除此文件'
           }, { status: 403 });
         }

         // 删除文件
         const { error } = await supabase.storage
           .from('prompt-manager')
           .remove([filePath]);

         if (error) {
           console.error('文件删除失败:', error);
           return NextResponse.json({
             error: '删除失败: ' + error.message
           }, { status: 500 });
         }

         return NextResponse.json({
           success: true,
           message: '文件删除成功'
         });

       } catch (error) {
         console.error('删除API错误:', error);
         return NextResponse.json({
           error: '服务器内部错误: ' + error.message
         }, { status: 500 });
       }
     }

     export async function GET(request) {
       try {
         const { userId } = auth();
         if (!userId) {
           return NextResponse.json({ error: '未授权访问' }, { status: 401 });
         }

         const { searchParams } = new URL(request.url);
         const folder = searchParams.get('folder') || userId;
         const limit = parseInt(searchParams.get('limit') || '50');

         // 验证权限 - 只能访问自己的文件夹
         if (folder !== userId && !folder.startsWith(userId + '/')) {
           return NextResponse.json({
             error: '无权限访问此文件夹'
           }, { status: 403 });
         }

         // 列出用户的文件
         const { data, error } = await supabase.storage
           .from('prompt-manager')
           .list(folder, {
             limit: limit,
             sortBy: { column: 'created_at', order: 'desc' }
           });

         if (error) {
           console.error('获取文件列表失败:', error);
           return NextResponse.json({
             error: '获取文件列表失败: ' + error.message
           }, { status: 500 });
         }

         // 为每个文件生成公开URL
         const filesWithUrls = data.map(file => {
           const filePath = `${folder}/${file.name}`;
           const { data: urlData } = supabase.storage
             .from('prompt-manager')
             .getPublicUrl(filePath);

           return {
             ...file,
             path: filePath,
             url: urlData.publicUrl
           };
         });

         return NextResponse.json({
           success: true,
           data: filesWithUrls
         });

       } catch (error) {
         console.error('获取文件列表API错误:', error);
         return NextResponse.json({
           error: '服务器内部错误: ' + error.message
         }, { status: 500 });
       }
     }

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST(request) {
  try {
    // 获取用户认证信息 - 修复异步调用
    const { userId } = await auth();
    
    console.log('User ID from auth:', userId); // 调试日志
    
    if (!userId) {
      console.error('No userId found in auth');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    const formData = await request.formData();
    const file = formData.get('image');
    
    console.log('File received:', file?.name, file?.size); // 调试日志
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 获取文件扩展名
    const fileExtension = file.name.split('.').pop();
    // 使用用户ID和时间戳生成文件路径，符合RLS策略
    const fileName = `${userId}/${Date.now()}.${fileExtension}`;
    
    console.log('Uploading to bucket with fileName:', fileName); // 调试日志
    
    // 上传到 Supabase Storage (使用prompt-covers bucket)
    const { data, error } = await supabase.storage
      .from('prompt-covers')
      .upload(fileName, file);

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    console.log('Upload successful, data:', data); // 调试日志

    // 获取文件的公共URL
    const { data: { publicUrl } } = supabase.storage
      .from('prompt-covers')
      .getPublicUrl(fileName);
    
    console.log('Public URL generated:', publicUrl); // 调试日志
    
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file: ' + error.message }, { status: 500 });
  }
} 

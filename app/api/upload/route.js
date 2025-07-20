import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserSupabaseClient } from '../../../lib/supabase';

export async function POST(request) {
  try {
    // 获取用户认证信息
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createUserSupabaseClient(userId);

    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 获取文件扩展名
    const fileExtension = file.name.split('.').pop();
    // 使用用户ID和时间戳生成文件路径，符合RLS策略
    const fileName = `${userId}/${Date.now()}.${fileExtension}`;
    
    // 上传到 Supabase Storage (使用prompt-covers bucket)
    const { data, error } = await supabase.storage
      .from('prompt-covers')
      .upload(fileName, file);

    if (error) {
      throw error;
    }

    // 获取文件的公共URL
    const { data: { publicUrl } } = supabase.storage
      .from('prompt-covers')
      .getPublicUrl(fileName);
    
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
} 
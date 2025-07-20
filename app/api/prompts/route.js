import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server'
import { createUserSupabaseClient } from '../../../lib/supabase';

export async function GET(request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = createUserSupabaseClient(userId);
  
  // 从 URL 中获取 tag 参数
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');

  let query = supabase
    .from('prompts')
    .select('*')
    .eq('user_id', userId);
  // 如果存在 tag 参数，添加过滤条件
  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const { data: prompts, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(prompts);
}

export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: '用户未认证' }, { status: 401 });
    }

    const supabase = createUserSupabaseClient(userId);

    const data = await request.json();
    
    // 验证必需字段
    if (!data.title || !data.content) {
      return NextResponse.json({ error: '标题和内容为必填项' }, { status: 400 });
    }

    // 准备插入数据
    const insertData = {
      title: data.title,
      content: data.content,
      description: data.description || '',
      user_id: userId,
      version: data.version || '1.0',
      tags: data.tags || '',
      cover_img: data.cover_img || '',
      is_public: data.is_public || false
    };

    const { data: newPrompt, error } = await supabase
      .from('prompts')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newPrompt[0]);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
} 
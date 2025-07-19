import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: tags, error } = await supabase
      .from('tags')
      .select('name');

    if (error) {
      throw error;
    }

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '标签名称不能为空' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // 检查标签是否已存在
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id, name')
      .eq('name', name.trim())
      .single();

    if (existingTag) {
      return NextResponse.json(existingTag);
    }

    // 创建新标签
    const { data, error } = await supabase
      .from('tags')
      .insert([{ name: name.trim() }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: '创建标签失败' }, { status: 500 });
  }
} 

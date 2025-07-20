import { NextResponse } from 'next/server';
import { supabaseAnon } from '../../../../lib/supabase';

export async function GET(request, { params }) {
  const { id } = await params;
  
  const { data: prompt, error } = await supabaseAnon
    .from('prompts')
    .select('*')
    .eq('id', id)
    .eq('is_public', true) // 只返回公开的提示词
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt not found or not public' }, { status: 404 });
  }

  return NextResponse.json(prompt);
} 

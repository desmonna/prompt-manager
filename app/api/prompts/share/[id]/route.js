import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server'
import { createUserSupabaseClient } from '../../../../../lib/supabase';

export async function POST(request, { params }) {
  const { id } = await params;
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = createUserSupabaseClient(userId);
  
  // 检查提示词是否存在
  const { data: prompt, error: checkError } = await supabase
    .from('prompts')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (checkError || !prompt) {
    return NextResponse.json(
      { error: checkError ? checkError.message : 'Prompt not found' }, 
      { status: 404 }
    );
  }

  // 更新 is_public 为 true
  const { error: updateError } = await supabase
    .from('prompts')
    .update({ 
      is_public: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Prompt shared successfully' });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTextWithCloubic } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { name, style, backstory } = await req.json();
    
    // Generate an enriched persona using AI
    const systemPrompt = "你是一个专业的虚拟模特IP制作人，以香奈儿(Chanel)的高级感为基调。";
    const userPrompt = `请为我的虚拟模特设计详细的人设档案。
名字：${name}
风格：${style}
背景设定：${backstory}
要求：输出结构化的档案描述，包含外貌特征、穿搭偏好和人物气质。`;

    const aiResponse = await generateTextWithCloubic([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // Save to Postgres
    const result = await db.query(
      `INSERT INTO models (name, style, backstory) VALUES ($1, $2, $3) RETURNING *`,
      [name, style, aiResponse]
    );

    return NextResponse.json({ success: true, model: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error generating persona:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

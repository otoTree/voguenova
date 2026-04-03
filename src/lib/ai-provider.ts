// src/lib/ai-provider.ts
const CLOUBIC_BASE_URL = process.env.CLOUBIC_BASE_URL || "https://api.cloubic.com/v1";
const CLOUBIC_API_KEY = process.env.CLOUBIC_API_KEY || "";

interface Message {
  role: "system" | "user" | "assistant";
  content: string | unknown[];
}

// 1. 文本生成
export async function generateTextWithCloubic(messages: Message[], model = "gpt-4o") {
  const response = await fetch(`${CLOUBIC_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUBIC_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Cloubic API Error: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// 2. 图片生成
export async function generateImageWithCloubic(prompt: string, referenceImageUrl?: string[], n = 1) {
  const messages: Message[] = [];
  
  if (referenceImageUrl) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...referenceImageUrl.map(url => ({ type: "image_url", image_url: { url } }))
      ]
    });
  } else {
    messages.push({
      role: "user",
      content: prompt
    });
  }

  const response = await fetch(`${CLOUBIC_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUBIC_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gemini-3-pro-image-preview",
      messages,
      n,
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Cloubic API Error: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  // Extract URL from Markdown format ![...](url) or JSON
  let imageUrl = content;
  const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch && mdMatch[1]) {
    imageUrl = mdMatch[1];
  } else if (content.startsWith("{")) {
    try {
      const parsed = JSON.parse(content);
      imageUrl = parsed.imageUrl || parsed.url || content;
    } catch {
      // fallback
    }
  }

  return imageUrl;
}

// 3. 视频生成
export async function generateVideoWithCloubic(prompt: string, imageUrl: string[], duration = 5,sound: string,aspect_ratio: string) {
  const response = await fetch(`${CLOUBIC_BASE_URL}/video/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUBIC_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "kling-v3-omni-pro",
      prompt,
      duration,
      metadata: {
        multi_shot: false,
        aspect_ratio,
        sound,
        image_list: imageUrl.map(url => ({ image_url: url }))
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Cloubic API Error: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`
    );
  }

  const data = await response.json();
  return data.id || data.task_id || data.data?.task_id;
}

// 4. 视频任务查询
export async function getVideoStatusWithCloubic(taskId: string) {
  const response = await fetch(`${CLOUBIC_BASE_URL}/video/generations/${taskId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${CLOUBIC_API_KEY}`
    }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Cloubic API Error: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`
    );
  }

  const data = await response.json();
  
  // Handle both response structures
  const statusData = data.data || data;
  
  return {
    id: statusData.id || statusData.task_id,
    status: statusData.status,
    videoUrl: statusData.url,
    progress: statusData.progress
  };
}

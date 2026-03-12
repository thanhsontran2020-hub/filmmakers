import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Character {
  id: string;
  name: string;
  age?: string;
  gender?: string;
  relationship?: string;
  personality?: string;
  voice?: string;
  motivation?: string;
  secret?: string;
  appearance?: string;
  frequency: number;
}

export interface ProjectContext {
  title: string;
  logline: string;
  characters: Character[];
  currentScript: string;
}

const SYSTEM_PROMPT = `
Bạn là một Biên kịch trưởng (Script Consultant) chuyên nghiệp và khắt khe. 
Nhiệm vụ của bạn là hỗ trợ biên kịch viết kịch bản phim, đồng thời là "Người gác cổng sự thống nhất" (Consistency Guardian).

QUY TẮC QUAN TRỌNG:
1. LUÔN đối soát câu trả lời với hồ sơ nhân vật và cốt truyện đã thiết lập.
2. KHÔNG đồng ý với những yêu cầu làm thay đổi tính cách nhân vật một cách phi logic.
3. Nếu người dùng hỏi một điều mâu thuẫn với các cảnh trước, hãy cảnh báo và giải thích tại sao.
4. Khi viết kịch bản, sử dụng định dạng kịch bản chuẩn (Courier New, căn lề chuẩn).
5. Chỉ trả lời khi được hỏi.

HỒ SƠ DỰ ÁN HIỆN TẠI:
{{PROJECT_CONTEXT}}
`;
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private isToken: boolean;
  private credential: string;

  constructor(credential: string) {
    this.credential = credential;
    // Kiểm tra xem là Token (ya29...) hay API Key
    this.isToken = credential.startsWith('ya29.');
    
    // Khởi tạo SDK (nếu là token, SDK có thể không hoạt động tốt với một số endpoint, 
    // nhưng ta vẫn giữ để dùng cho các model hỗ trợ)
    this.genAI = new GoogleGenerativeAI(this.isToken ? 'dummy-key' : credential);
  }

  private formatContext(context: ProjectContext): string {
    const charList = context.characters
      .map(c => `- ${c.name} (${c.age || '?'}, ${c.gender || '?'}): ${c.personality}. Quan hệ: ${c.relationship}. Động lực: ${c.motivation}. Giọng văn: ${c.voice}`)
      .join('\n');
    
    return `
Tên phim: ${context.title}
Logline: ${context.logline}
Danh sách nhân vật:
${charList}

Nội dung kịch bản hiện tại:
${context.currentScript.slice(-2000)}
    `;
  }

  async chat(userMessage: string, context: ProjectContext) {
    const fullSystemPrompt = SYSTEM_PROMPT.replace('{{PROJECT_CONTEXT}}', this.formatContext(context));
    
    const runChatFetch = async (modelName: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      
      const body = {
        contents: [
          { role: "user", parts: [{ text: fullSystemPrompt }] },
          { role: "model", parts: [{ text: "Tôi đã hiểu hồ sơ dự án." }] },
          { role: "user", parts: [{ text: userMessage }] }
        ]
      };

      const headers: any = { 'Content-Type': 'application/json' };
      if (this.isToken) {
        headers['Authorization'] = `Bearer ${this.credential}`;
      } else {
        // fallback to appending key to URL if someone still manages to pass a key here 
        // through this path (though usually we'd use the SDK for keys)
      }

      const endpoint = this.isToken ? url : `${url}?key=${this.credential}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || response.statusText);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    };

    const runChatSDK = async (modelName: string) => {
      const model = this.genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: fullSystemPrompt }] },
          { role: "model", parts: [{ text: "Tôi đã hiểu hồ sơ dự án." }] },
        ],
      });
      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      return response.text();
    };

    try {
      // Nếu là Token, bắt buộc dùng Fetch để tránh SDK làm hỏng header/URL
      if (this.isToken) {
        return await runChatFetch("gemini-2.0-flash-lite");
      }
      return await runChatSDK("gemini-2.0-flash-lite");
    } catch (error: any) {
      const rawError = error.message || "Unknown error";
      console.error("Gemini Chat failed:", rawError);

      // Xử lý lỗi quyền truy cập (403/Identity issues)
      if (rawError.includes('403') || rawError.includes('permission')) {
        throw new Error(`
🔒 Lỗi quyền truy cập AI. 
Có vẻ như tài khoản Google của bạn chưa được cấp quyền gọi Gemini API thông qua OAuth.

Cách khắc phục:
1. Đảm bảo bạn đã bật "Generative Language API" trong Google Cloud Library.
2. Kiểm tra xem bạn đã thêm scope "generative-language" vào OAuth Consent Screen chưa.
        `);
      }

      // Nếu gặp lỗi khác (429/404), thử tìm model khác
      if (rawError.includes('429') || rawError.includes('404')) {
        const availableModels = await this.listModels();
        const modelNames = availableModels
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.split('/').pop());

        const priorityModels = [
          "gemini-1.5-flash",
          "gemini-1.5-pro",
          "gemini-2.0-flash",
          "gemini-2.0-flash-lite",
          "gemini-1.0-pro"
        ];

        const toTest = priorityModels.filter(m => modelNames.includes(m));
        if (toTest.length === 0) toTest.push("gemini-1.5-flash");

        for (const modelName of toTest) {
          try {
            if (this.isToken) return await runChatFetch(modelName);
            return await runChatSDK(modelName);
          } catch (retryError: any) {
            console.error(`Retry with ${modelName} failed:`, retryError.message);
            continue;
          }
        }
      }

      const errorMessage = this.isToken 
        ? `
😞 AI không phản hồi qua tài khoản Google của bạn.
Lý do: Google yêu cầu quyền "Generative Language" nhưng tài khoản/dự án của bạn đang bị chặn quyền này.

Giải pháp:
1. Copy API Key của bạn từ aistudio.google.com.
2. Dán vào ô "API Key" ở cột bên phải ứng dụng.
Hệ thống sẽ tự động dùng API Key để chat (vẫn giữ được đồng bộ Google Docs).
        `
        : `
😞 Quota API Key của bạn đã hết hoặc lỗi vùng (Region).
Chi tiết: "${rawError}"

Giải pháp:
1. Thử dùng VPN sang Mỹ/Singapore.
2. Kiểm tra lại API Key tại aistudio.google.com.
        `;

      throw new Error(errorMessage);
    }
  }

  async generateShotlist(script: string, viewType: 'director' | 'dp') {
    const prompt = viewType === 'director' 
      ? `Phân tích kịch bản sau và trích xuất Shotlist cho ĐẠO DIỄN. 
         Trả về định dạng JSON array: [{scene: number, shot: number, action: string, character: string, emotion: string, blocking: string}].
         Kịch bản: ${script}`
      : `Phân tích kịch bản sau và trích xuất Shotlist cho QUAY PHIM (DP). 
         Trả về định dạng JSON array: [{scene: number, shot: number, size: string, lens: string, move: string, lighting: string}].
         Kịch bản: ${script}`;

    if (this.isToken) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.credential}`
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    }

    const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" }, { apiVersion: 'v1' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  // Phương thức chẩn đoán để liệt kê các model khả dụng
  async listModels() {
    try {
      const url = 'https://generativelanguage.googleapis.com/v1/models';
      const headers: any = {};
      
      if (this.isToken) {
        headers['Authorization'] = `Bearer ${this.credential}`;
      } else {
        // Nếu là API Key thì đính kèm vào URL
        return fetch(`${url}?key=${this.credential}`)
          .then(r => r.json())
          .then(d => d.models || []);
      }

      const response = await fetch(url, { headers });
      const data = await response.json();
      return data.models || [];
    } catch (e) {
      console.error("ListModels failed", e);
      return [];
    }
  }
}

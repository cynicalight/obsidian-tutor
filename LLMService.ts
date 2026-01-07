import { requestUrl, RequestUrlParam } from 'obsidian';
import { PluginSettings } from './types';

export class LLMService {
    settings: PluginSettings;

    constructor(settings: PluginSettings) {
        this.settings = settings;
    }

    private getLanguageInstruction(): string {
        const langPart = this.settings.language === 'zh'
            ? " Please respond in Chinese (Simplified)."
            : " Please respond in English.";
        return langPart + " ALWAYS use $...$ for inline math and $$...$$ for block math. Do NOT use \\( ... \\) or \\[ ... \\].";
    }

    async callLLM(messages: { role: string; content: string | any[] }[], modelOverride?: string): Promise<string> {
        if (!this.settings.apiKey) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        // Remove trailing slash from base URL if present
        const baseUrl = this.settings.apiBaseUrl.replace(/\/$/, '');
        const url = `${baseUrl}/chat/completions`;

        const body = {
            model: modelOverride || this.settings.modelName,
            messages: messages,
            temperature: 0.7
        };

        // console.log('Calling LLM:', url, body);

        const params: RequestUrlParam = {
            url: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`
            },
            body: JSON.stringify(body)
        };

        try {
            const response = await requestUrl(params);
            // console.log('LLM Response Status:', response.status);

            const data = response.json;
            if (data.error) {
                throw new Error(data.error.message || 'Unknown API Error');
            }
            return data.choices[0].message.content;
        } catch (error) {
            console.error('LLM Call Failed:', error);
            if (error.status === 401) {
                throw new Error('Invalid API Key (401 Unauthorized)');
            }
            if (error.status === 404) {
                throw new Error('Model or Endpoint not found (404). Check Base URL and Model Name.');
            }
            throw error;
        }
    }

    async generateQuestions(context: string): Promise<string[]> {
        const messages = [
            { role: 'system', content: this.settings.systemPromptQuiz + this.getLanguageInstruction() },
            { role: 'user', content: `Here is the note content:\n\n${context}` }
        ];

        const response = await this.callLLM(messages);

        try {
            // Try to parse JSON if the model returns a JSON string
            // Sometimes models wrap JSON in markdown code blocks
            let cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanResponse);
        } catch (e) {
            console.warn('Failed to parse JSON from LLM response, returning raw split', e);
            // Fallback: split by newlines if not JSON
            return response.split('\n').filter(line => line.trim().length > 0);
        }
    }

    async evaluateAnswer(question: string, userAnswer: string, noteContext: string): Promise<string> {
        const prompt = this.settings.systemPromptEvaluate
            .replace('{question}', question)
            .replace('{userAnswer}', userAnswer)
            .replace('{context}', noteContext);

        const messages = [
            { role: 'system', content: "You are a helpful tutor. ALWAYS use $ delimiters for inline math (e.g. $E=mc^2$) and $$ for block math. CONSTANTLY AVOID using \\( ... \\) or separate parentheses for math." + this.getLanguageInstruction() },
            { role: 'user', content: prompt }
        ];

        return await this.callLLM(messages);
    }

    async chatWithNote(query: string, noteContext: string, images?: string[], modelOverride?: string): Promise<string> {
        const systemMsg = "You are a helpful assistant answering questions based on the provided note content." + this.getLanguageInstruction();

        let userContent: string | any[] = `Context:\n${noteContext}\n\nQuestion: ${query}`;

        if (images && images.length > 0) {
            userContent = [
                { type: "text", text: userContent as string }
            ];
            for (const img of images) {
                userContent.push({
                    type: "image_url",
                    image_url: {
                        url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`
                    }
                });
            }
        }

        const messages = [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userContent }
        ];

        return await this.callLLM(messages, modelOverride);
    }
}

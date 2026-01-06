import { requestUrl, RequestUrlParam } from 'obsidian';
import { PluginSettings } from './types';

export class LLMService {
    settings: PluginSettings;

    constructor(settings: PluginSettings) {
        this.settings = settings;
    }

    private getLanguageInstruction(): string {
        return this.settings.language === 'zh'
            ? " Please respond in Chinese (Simplified)."
            : " Please respond in English.";
    }

    async callLLM(messages: any[]): Promise<string> {
        if (!this.settings.apiKey) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        // Remove trailing slash from base URL if present
        const baseUrl = this.settings.apiBaseUrl.replace(/\/$/, '');
        const url = `${baseUrl}/chat/completions`;

        const body = {
            model: this.settings.modelName,
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
            { role: 'system', content: "You are a helpful tutor." + this.getLanguageInstruction() }, // System prompt is partly in the user message template in settings, but we can also set a base system prompt.
            { role: 'user', content: prompt }
        ];

        return await this.callLLM(messages);
    }

    async chatWithNote(query: string, noteContext: string): Promise<string> {
        const messages = [
            { role: 'system', content: "You are a helpful assistant answering questions based on the provided note content." + this.getLanguageInstruction() },
            { role: 'user', content: `Context:\n${noteContext}\n\nQuestion: ${query}` }
        ];

        return await this.callLLM(messages);
    }
}

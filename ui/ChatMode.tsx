import * as React from 'react';
import SmartReviewerPlugin from '../main';
import { LLMService } from '../LLMService';
import { SkeletonLoader } from './SkeletonLoader';
import { MarkdownContent } from './MarkdownContent';

interface ChatModeProps {
    plugin: SmartReviewerPlugin;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const ChatMode: React.FC<ChatModeProps> = ({ plugin }) => {
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    
    // Re-create service when settings change
    const llmService = React.useMemo(() => new LLMService(plugin.settings), [
        plugin.settings.apiKey, 
        plugin.settings.apiBaseUrl, 
        plugin.settings.modelName
    ]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        
        const file = plugin.app.workspace.getActiveFile();
        let context = '';
        if (file) {
            context = await plugin.app.vault.read(file);
        }

        const userMsg: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            console.log('Sending message to LLM...');
            const response = await llmService.chatWithNote(userMsg.content, context);
            console.log('Received response:', response);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (e) {
            console.error('Chat Error:', e);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (e.message || String(e)) }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-mode">
            <div className="messages">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        <strong>{m.role === 'user' ? 'You' : 'Tutor'}:</strong>
                        {m.role === 'assistant' ? (
                            <MarkdownContent content={m.content} plugin={plugin} />
                        ) : (
                            <p>{m.content}</p>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="message assistant">
                        <strong>Tutor:</strong>
                        <SkeletonLoader />
                    </div>
                )}
            </div>
            <div className="input-area">
                <textarea 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    placeholder="Ask a question..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()}>Send</button>
            </div>
        </div>
    );
};

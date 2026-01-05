import * as React from 'react';
import SmartReviewerPlugin from '../main';
import { LLMService } from '../LLMService';

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
    
    const llmService = React.useMemo(() => new LLMService(plugin.settings), [plugin.settings]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        
        const file = plugin.app.workspace.getActiveFile();
        let context = '';
        if (file) {
            context = await plugin.app.vault.read(file);
        }

        const newMessages = [...messages, { role: 'user', content: input } as Message];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const response = await llmService.chatWithNote(input, context);
            setMessages([...newMessages, { role: 'assistant', content: response }]);
        } catch (e) {
            console.error(e);
            setMessages([...newMessages, { role: 'assistant', content: 'Error: ' + e.message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-mode">
            <div className="messages">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        <strong>{m.role === 'user' ? 'You' : 'AI'}:</strong>
                        <p>{m.content}</p>
                    </div>
                ))}
            </div>
            <div className="input-area">
                <textarea 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                />
                <button onClick={sendMessage} disabled={loading}>Send</button>
            </div>
        </div>
    );
};

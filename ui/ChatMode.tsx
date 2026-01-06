import * as React from 'react';
// ChatMode component
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

    const isZh = plugin.settings.language === 'zh';
    const t = {
        title: isZh ? '与导师对话' : 'Chat with Tutor',
        clear: isZh ? '清空' : 'Clear',
        clearConfirm: isZh ? '确定要清空聊天记录吗？' : 'Clear chat history?',
        you: isZh ? '你' : 'You',
        tutor: isZh ? '导师' : 'Tutor',
        placeholder: isZh ? '输入问题...' : 'Ask a question...',
        send: isZh ? '发送' : 'Send',
    };

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
            <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{t.title}</h3>
                {messages.length > 0 && (
                    <button 
                        onClick={() => {
                            if (confirm(t.clearConfirm)) {
                                setMessages([]);
                            }
                        }}
                        title={t.clear}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                        🗑️ {t.clear}
                    </button>
                )}
            </div>
            <div className="messages">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        {m.role === 'assistant' ? (
                            <MarkdownContent content={m.content} plugin={plugin} />
                        ) : (
                            <p style={{ margin: 0 }}>{m.content}</p>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="message assistant">
                        <SkeletonLoader />
                    </div>
                )}
            </div>
            <div className="input-area">
                <textarea 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    placeholder={t.placeholder}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()}>{t.send}</button>
            </div>
        </div>
    );
};

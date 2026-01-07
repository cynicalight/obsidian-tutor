import * as React from 'react';
import { LLMService } from '../LLMService';
import { SkeletonLoader } from './SkeletonLoader';
import { MarkdownContent } from './MarkdownContent';
import { TutorContext } from './types';

interface ChatModeProps {
    context: TutorContext;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const ChatMode: React.FC<ChatModeProps> = ({ context }) => {
    const { app, settings } = context;
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [confirmClear, setConfirmClear] = React.useState(false);
    
    // Re-create service when settings change
    const llmService = React.useMemo(() => new LLMService(settings), [
        settings.apiKey, 
        settings.apiBaseUrl, 
        settings.modelName
    ]);

    const isZh = settings.language === 'zh';
    const t = {
        title: isZh ? '与导师对话' : 'Chat with tutor',
        clear: isZh ? '清空' : 'Clear',
        clearConfirm: isZh ? '确定要清空聊天记录吗？' : 'Clear chat history?',
        confirm: isZh ? '确认清空?' : 'Confirm clear?',
        you: isZh ? '你' : 'You',
        tutor: isZh ? '导师' : 'Tutor',
        placeholder: isZh ? '输入问题...' : 'Ask a question...',
        send: isZh ? '发送' : 'Send',
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        
        const file = app.workspace.getActiveFile();
        let fileContext = '';
        if (file) {
            fileContext = await app.vault.read(file);
        }

        const userMsg: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const response = await llmService.chatWithNote(userMsg.content, fileContext);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (e) {
            console.error('Chat Error:', e);
            const error = e as Error;
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (error.message || String(e)) }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        if (confirmClear) {
            setMessages([]);
            setConfirmClear(false);
        } else {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000);
        }
    };

    return (
        <div className="chat-mode">
            <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
                <h3 style={{ margin: 0 }}>{t.title}</h3>
                {messages.length > 0 && (
                    <button 
                        onClick={handleClear}
                        title={t.clear}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                        🗑️ {confirmClear ? t.confirm : t.clear}
                    </button>
                )}
            </div>
            <div className="messages">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        {m.role === 'assistant' ? (
                            <MarkdownContent content={m.content} context={context} />
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
                            void sendMessage();
                        }
                    }}
                />
                <button onClick={() => void sendMessage()} disabled={loading || !input.trim()}>{t.send}</button>
            </div>
        </div>
    );
};

import * as React from 'react';
import { LLMService } from '../LLMService';
import { SkeletonLoader } from './SkeletonLoader';
import { MarkdownContent } from './MarkdownContent';
import { TutorContext } from './types';
import { Notice } from 'obsidian';

interface ChatModeProps {
    context: TutorContext;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const Icons = {
    // ... other icons
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
    Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
};

export const ChatMode: React.FC<ChatModeProps> = ({ context }) => {
    const { app, settings } = context;
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [confirmClear, setConfirmClear] = React.useState(false);
    const [images, setImages] = React.useState<string[]>([]);
    const [modelType, setModelType] = React.useState<'chat' | 'thinking'>('chat');
    
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
        placeholder: isZh ? '输入问题 (Ctrl+V 粘贴图片)...' : 'Ask a question (Ctrl+V to paste image)...',
        send: isZh ? '发送' : 'Send',
        copy: isZh ? '复制' : 'Copy',
        edit: isZh ? '编辑' : 'Edit',
        delete: isZh ? '删除' : 'Delete',
        modelChat: isZh ? '聊天' : 'Chat',
        modelThink: isZh ? '推理' : 'Reason',
        copied: isZh ? '已复制' : 'Copied'
    };

    const sendMessage = async () => {
        if (!input.trim() && images.length === 0) return;
        
        const file = app.workspace.getActiveFile();
        let fileContext = '';
        if (file) {
            fileContext = await app.vault.read(file);
        }

        const userMsg: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        
        setMessages(newMessages);
        setInput('');
        const currentImages = [...images]; // Capture current images
        setImages([]); // Clear images
        setLoading(true);

        const modelOverride = modelType === 'thinking' ? 'deepseek-reasoner' : undefined;

        try {
            const response = await llmService.chatWithNote(userMsg.content, fileContext, currentImages, modelOverride);
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

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        new Notice(t.copied);
    };

    const handleDelete = (index: number) => {
        const newMessages = [...messages];
        newMessages.splice(index, 1);
        setMessages(newMessages);
    };

    const handleEdit = (content: string) => {
        setInput(content);
        // Optionally focus textarea?
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    setImages(prev => [...prev, base64]);
                };
                if (blob) reader.readAsDataURL(blob);
            }
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
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
                    <div key={i} className={`message-container ${m.role}`} style={{ position: 'relative' }}>
                        <div className={`message ${m.role}`}>
                            {m.role === 'assistant' ? (
                                <MarkdownContent content={m.content} context={context} />
                            ) : (
                                <p style={{ margin: 0 }}>{m.content}</p>
                            )}
                        </div>
                        <div className="message-toolbar" style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', opacity: 0.6 }}>
                            <button className="icon-btn" onClick={() => handleCopy(m.content)} title={t.copy}><Icons.Copy /></button>
                            {m.role === 'user' && (
                                <button className="icon-btn" onClick={() => handleEdit(m.content)} title={t.edit}><Icons.Edit /></button>
                            )}
                            <button className="icon-btn" onClick={() => handleDelete(i)} title={t.delete}><Icons.Trash /></button>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="message assistant">
                        <SkeletonLoader />
                    </div>
                )}
            </div>
            
            {images.length > 0 && (
                <div className="image-preview-area" style={{ display: 'flex', gap: '8px', padding: '8px', overflowX: 'auto' }}>
                    {images.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                            <img src={img} alt="Pasted" style={{ height: '60px', borderRadius: '4px', border: '1px solid var(--background-modifier-border)' }} />
                            <button 
                                onClick={() => removeImage(idx)}
                                style={{ position: 'absolute', top: -5, right: -5, padding: 0, width: '16px', height: '16px', borderRadius: '50%', background: 'var(--text-error)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                            >✕</button>
                        </div>
                    ))}
                </div>
            )}

            <div className="input-area" style={{ paddingTop: '8px', borderTop: '1px solid var(--background-modifier-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    disabled={loading}
                    placeholder={t.placeholder}
                    rows={2}
                    style={{ resize: 'none', maxHeight: '150px' }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void sendMessage();
                        }
                    }}
                />
                <div className="input-footer">
                    <div className="model-selector">
                         <select 
                            value={modelType} 
                            onChange={(e) => setModelType(e.target.value as 'chat' | 'thinking')}
                         >
                             <option value="chat">{t.modelChat}</option>
                             <option value="thinking">{t.modelThink}</option>
                         </select>
                    </div>
                    <button 
                        className="send-btn"
                        onClick={() => void sendMessage()} 
                        disabled={loading || (!input.trim() && images.length === 0)} 
                        title={t.send}
                    >
                        <Icons.Send />
                    </button>
                </div>
            </div>
        </div>
    );
};

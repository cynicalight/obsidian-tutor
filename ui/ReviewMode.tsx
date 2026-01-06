import * as React from 'react';
import { TutorContext } from './types';
import { ReviewService } from '../ReviewService';
import { LLMService } from '../LLMService';
import { TFile, HeadingCache, Notice } from 'obsidian';
import { SkeletonLoader } from './SkeletonLoader';

interface ReviewModeProps {
    context: TutorContext;
}

export const ReviewMode: React.FC<ReviewModeProps> = ({ context }) => {
    const { app, settings, saveSettings } = context;
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'selecting_chapters' | 'quiz' | 'result'>('idle');
    const [diffContent, setDiffContent] = React.useState<string>('');
    const [questions, setQuestions] = React.useState<string[]>([]);
    const [answers, setAnswers] = React.useState<string[]>([]);
    const [evaluations, setEvaluations] = React.useState<string[]>([]);
    const [currentFile, setCurrentFile] = React.useState<TFile | null>(null);
    const [availableHeadings, setAvailableHeadings] = React.useState<HeadingCache[]>([]);
    const [selectedHeadings, setSelectedHeadings] = React.useState<Set<number>>(new Set());
    const [confirmRestart, setConfirmRestart] = React.useState(false);

    const isZh = settings.language === 'zh';
    const t = {
        startPrompt: isZh ? '点击开始以复习此笔记的变更。' : 'Click start to review new changes in this note.',
        startBtn: isZh ? '开始复习' : 'Start review',
        submitBtn: isZh ? '提交答案' : 'Submit answers',
        
        // Translation updates
        noChanges: isZh ? '没有检测到新变更。' : 'No new changes detected.',
        chooseAction: isZh ? '请选择操作：' : 'Select an action:',
        generalReview: isZh ? '总复习 (选择章节)' : 'General review (select chapters)',
        selectChapters: isZh ? '选择要复习的章节：' : 'Select chapters to review:',
        startGeneralReview: isZh ? '开始章节复习' : 'Start chapter review',
        cancel: isZh ? '取消' : 'Cancel',

        doneBtn: isZh ? '完成' : 'Done',
        restartBtn: isZh ? '重新开始' : 'Restart',
        restartConfirm: isZh ? '确认重开?' : 'Sure to restart?',
        reviewTitle: isZh ? '复习变更' : 'Review changes',
        feedback: isZh ? '反馈：' : 'Feedback:',
        question: isZh ? '问题' : 'Q',
        error: isZh ? '错误' : 'Error',
    };

    const reviewService = React.useMemo(() => new ReviewService(app, settings, saveSettings), 
        [app, settings, saveSettings]);
        
    const llmService = React.useMemo(() => new LLMService(settings), [
        settings.apiKey, 
        settings.apiBaseUrl, 
        settings.modelName
    ]);

    const startReview = async () => {
        const file = app.workspace.getActiveFile();
        if (!file) {
            new Notice(t.noChanges); // Just reuse this or generic error
            return;
        }
        setCurrentFile(file);
        setStatus('loading');
        
        try {
            const diff = await reviewService.getNewContent(file);
            
            if (!diff || diff.trim().length === 0) {
                const requestHeadings = reviewService.getHeadings(file);
                if (requestHeadings && requestHeadings.length > 0) {
                    setAvailableHeadings(requestHeadings);
                    setStatus('selecting_chapters');
                } else {
                     new Notice(t.noChanges); 
                     setStatus('idle');
                }
                return;
            }

            setDiffContent(diff);
            const generatedQuestions = await llmService.generateQuestions(diff);
            setQuestions(generatedQuestions);
            setAnswers(new Array(generatedQuestions.length).fill(''));
            setStatus('quiz');
        } catch (e) {
            console.error(e);
            const error = e as Error;
            new Notice(t.error + ': ' + (error.message || String(e)));
            setStatus('idle');
        }
    };

    const startChapterReview = async () => {
        if (!currentFile || selectedHeadings.size === 0) return;
        
        setStatus('loading');
        try {
            const headingsToReview = availableHeadings.filter((_, i) => selectedHeadings.has(i));
            const content = await reviewService.getContentForHeadings(currentFile, headingsToReview);
            
            setDiffContent(content); 
            const generatedQuestions = await llmService.generateQuestions(content);
            setQuestions(generatedQuestions);
            setAnswers(new Array(generatedQuestions.length).fill(''));
            setStatus('quiz');
        } catch (e) {
            console.error(e);
            const error = e as Error;
            new Notice(t.error + ': ' + (error.message || String(e)));
            setStatus('idle');
        }
    };

    const toggleHeading = (index: number) => {
        const newSet = new Set(selectedHeadings);
        const isSelecting = !newSet.has(index);
        const targetLevel = availableHeadings[index].level;

        if (isSelecting) {
            newSet.add(index);
        } else {
            newSet.delete(index);
        }

        // Cascade to children
        for (let i = index + 1; i < availableHeadings.length; i++) {
            const h = availableHeadings[i];
            if (h.level <= targetLevel) break; // End of children scope
            
            if (isSelecting) {
                newSet.add(i);
            } else {
                newSet.delete(i);
            }
        }
        setSelectedHeadings(newSet);
    };

    const submitAnswers = async () => {
        setStatus('loading');
        try {
            const evals = await Promise.all(questions.map((q, i) => 
                llmService.evaluateAnswer(q, answers[i], diffContent)
            ));
            setEvaluations(evals);
            setStatus('result');
            
            if (currentFile) {
                await reviewService.saveSnapshot(currentFile, 'Completed');
            }
        } catch (e) {
            console.error(e);
            const error = e as Error;
            new Notice(t.error + ': ' + (error.message || String(e)));
            setStatus('quiz');
        }
    };
    
    const handleRestart = () => {
        if (confirmRestart) {
            setStatus('idle');
            setConfirmRestart(false);
        } else {
            setConfirmRestart(true);
            setTimeout(() => setConfirmRestart(false), 3000);
        }
    };

    const renderContent = () => {
        if (status === 'idle') {
            return (
                <>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
                        {t.startPrompt}
                    </p>
                    <button onClick={() => void startReview()}>{t.startBtn}</button>
                </>
            );
        }
        
        // ... rest of rendering logic same but ensuring no floating promises in onClick ...
        if (status === 'loading') {
            return (
                <>
                    <SkeletonLoader />
                    <SkeletonLoader />
                </>
            );
        }

        if (status === 'selecting_chapters') {
             return (
                <div style={{ 
                    padding: '10px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%' 
                }}>
                    <p><strong>{t.noChanges}</strong></p>
                    <p>{t.selectChapters}</p>
                    <div className="chapter-list" style={{ 
                        flex: 1,
                        overflowY: 'auto', 
                        border: '1px solid var(--background-modifier-border)',
                        borderRadius: '4px',
                        padding: '8px',
                        marginBottom: '10px'
                    }}>
                        {availableHeadings.map((h, i) => (
                            <div key={i} style={{ 
                                marginLeft: `${(h.level - 1) * 20}px`,
                                padding: '4px 0'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedHeadings.has(i)} 
                                        onChange={() => toggleHeading(i)}
                                    />
                                    <span>{h.heading}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={() => void startChapterReview()} 
                            disabled={selectedHeadings.size === 0}
                            style={{ flex: 1 }}
                        >
                            {t.startGeneralReview}
                        </button>
                        <button 
                            onClick={() => setStatus('idle')} 
                            style={{ 
                                background: 'transparent', 
                                border: '1px solid var(--background-modifier-border)',
                                color: 'var(--text-normal)' 
                            }}
                        >
                            {t.cancel}
                        </button>
                    </div>
                </div>
            );
        }

        if (status === 'quiz') {
            return (
                <>
                    {questions.map((q, i) => (
                        <div key={i} className="question-block">
                            <p><strong>{t.question}{i+1}:</strong> {q}</p>
                            <textarea 
                                value={answers[i]} 
                                onChange={(e) => {
                                    const newAnswers = [...answers];
                                    newAnswers[i] = e.target.value;
                                    setAnswers(newAnswers);
                                }}
                            />
                        </div>
                    ))}
                    <button onClick={() => void submitAnswers()}>{t.submitBtn}</button>
                </>
            );
        }

        if (status === 'result') {
            return (
                 <>
                    {evaluations.map((evalText, i) => (
                        <div key={i} className="evaluation-block">
                            <p><strong>Q:</strong> {questions[i]}</p>
                            <p><strong>A:</strong> {answers[i]}</p>
                            <p><strong>{t.feedback}</strong> {evalText}</p>
                        </div>
                    ))}
                    <button onClick={() => setStatus('idle')}>{t.doneBtn}</button>
                </>
            );
        }
    };

    return (
        <div className="review-mode">
            <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{t.reviewTitle}</h3>
                {status !== 'idle' && status !== 'loading' && (
                    <button 
                        onClick={handleRestart} 
                        title={t.restartBtn}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                        ↻ {confirmRestart ? t.restartConfirm : t.restartBtn}
                    </button>
                )}
            </div>
            {renderContent()}
        </div>
    );
};

import * as React from 'react';
import SmartReviewerPlugin from '../main';
import { ReviewService } from '../ReviewService';
import { LLMService } from '../LLMService';
import { TFile } from 'obsidian';
import { SkeletonLoader } from './SkeletonLoader';

interface ReviewModeProps {
    plugin: SmartReviewerPlugin;
}

export const ReviewMode: React.FC<ReviewModeProps> = ({ plugin }) => {
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'quiz' | 'result'>('idle');
    const [diffContent, setDiffContent] = React.useState<string>('');
    const [questions, setQuestions] = React.useState<string[]>([]);
    const [answers, setAnswers] = React.useState<string[]>([]);
    const [evaluations, setEvaluations] = React.useState<string[]>([]);
    const [currentFile, setCurrentFile] = React.useState<TFile | null>(null);

    const reviewService = React.useMemo(() => new ReviewService(plugin.app, plugin), [plugin]);
    const llmService = React.useMemo(() => new LLMService(plugin.settings), [
        plugin.settings.apiKey, 
        plugin.settings.apiBaseUrl, 
        plugin.settings.modelName
    ]);

    const startReview = async () => {
        const file = plugin.app.workspace.getActiveFile();
        if (!file) {
            // Show notice
            return;
        }
        setCurrentFile(file);
        setStatus('loading');
        
        try {
            const diff = await reviewService.getNewContent(file);
            setDiffContent(diff);
            
            if (!diff) {
                // Handle no changes
                setStatus('idle');
                return;
            }

            const generatedQuestions = await llmService.generateQuestions(diff);
            setQuestions(generatedQuestions);
            setAnswers(new Array(generatedQuestions.length).fill(''));
            setStatus('quiz');
        } catch (e) {
            console.error(e);
            setStatus('idle');
        }
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
                // Calculate average score or just save 'completed'
                await reviewService.saveSnapshot(currentFile, 'Completed');
            }
        } catch (e) {
            console.error(e);
            setStatus('quiz');
        }
    };

    if (status === 'idle') {
        return (
            <div className="review-mode">
                <h3>Review Changes</h3>
                <button onClick={startReview}>Start Review</button>
            </div>
        );
    }

    if (status === 'loading') {
        return (
            <div className="review-mode">
                <h3>Generating...</h3>
                <SkeletonLoader />
                <SkeletonLoader />
            </div>
        );
    }

    if (status === 'quiz') {
        return (
            <div className="review-mode">
                {questions.map((q, i) => (
                    <div key={i} className="question-block">
                        <p><strong>Q{i+1}:</strong> {q}</p>
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
                <button onClick={submitAnswers}>Submit Answers</button>
            </div>
        );
    }

    if (status === 'result') {
        return (
            <div className="review-mode">
                <h3>Results</h3>
                {evaluations.map((evalText, i) => (
                    <div key={i} className="evaluation-block">
                        <p><strong>Q:</strong> {questions[i]}</p>
                        <p><strong>A:</strong> {answers[i]}</p>
                        <p><strong>Feedback:</strong> {evalText}</p>
                    </div>
                ))}
                <button onClick={() => setStatus('idle')}>Done</button>
            </div>
        );
    }

    return null;
};

import { MarkdownRenderer } from 'obsidian';
import * as React from 'react';
import { TutorContext } from './types';

interface MarkdownContentProps {
    content: string;
    context: TutorContext;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, context }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            containerRef.current.empty();
            MarkdownRenderer.render(
                context.app,
                content,
                containerRef.current,
                '',
                context.component
            );
        }
    }, [content, context]);

    return <div ref={containerRef} className="tutor-markdown-content" />;
};

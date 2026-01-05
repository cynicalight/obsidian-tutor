import { MarkdownRenderer } from 'obsidian';
import * as React from 'react';
import SmartReviewerPlugin from '../main';

interface MarkdownContentProps {
    content: string;
    plugin: SmartReviewerPlugin;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, plugin }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            containerRef.current.empty();
            MarkdownRenderer.render(
                plugin.app,
                content,
                containerRef.current,
                '',
                plugin
            );
        }
    }, [content, plugin]);

    return <div ref={containerRef} className="markdown-preview-view" />;
};

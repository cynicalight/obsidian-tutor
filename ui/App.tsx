import * as React from 'react';
import { TutorContext } from './types';
import { ReviewMode } from './ReviewMode';
import { ChatMode } from './ChatMode';

interface AppProps {
    context: TutorContext;
}

export const App: React.FC<AppProps> = ({ context }) => {
    const [activeTab, setActiveTab] = React.useState<'review' | 'chat'>('review');

    return (
        <div className="smart-reviewer-container">
            <div className="nav-buttons">
                <button 
                    className={activeTab === 'review' ? 'active' : ''} 
                    onClick={() => setActiveTab('review')}
                >
                    Review mode
                </button>
                <button 
                    className={activeTab === 'chat' ? 'active' : ''} 
                    onClick={() => setActiveTab('chat')}
                >
                    Chat mode
                </button>
            </div>
            <div className="content-area">
                <div style={{ display: activeTab === 'review' ? 'block' : 'none', height: '100%' }}>
                    <ReviewMode context={context} />
                </div>
                <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
                    <ChatMode context={context} />
                </div>
            </div>
        </div>
    );
};

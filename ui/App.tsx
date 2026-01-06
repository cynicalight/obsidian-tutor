import * as React from 'react';
import SmartReviewerPlugin from '../main';
import { ReviewMode } from './ReviewMode';
import { ChatMode } from './ChatMode'; // Import ChatMode component

interface AppProps {
    plugin: SmartReviewerPlugin;
}

export const App: React.FC<AppProps> = ({ plugin }) => {
    const [activeTab, setActiveTab] = React.useState<'review' | 'chat'>('review');

    return (
        <div className="smart-reviewer-container">
            <div className="nav-buttons">
                <button 
                    className={activeTab === 'review' ? 'active' : ''} 
                    onClick={() => setActiveTab('review')}
                >
                    Review Mode
                </button>
                <button 
                    className={activeTab === 'chat' ? 'active' : ''} 
                    onClick={() => setActiveTab('chat')}
                >
                    Chat Mode
                </button>
            </div>
            <div className="content-area">
                <div style={{ display: activeTab === 'review' ? 'block' : 'none', height: '100%' }}>
                    <ReviewMode plugin={plugin} />
                </div>
                <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
                    <ChatMode plugin={plugin} />
                </div>
            </div>
        </div>
    );
};

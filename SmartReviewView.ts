import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import SmartReviewerPlugin from './main';
import { App as ReactApp } from './ui/App';

export const VIEW_TYPE_SMART_REVIEW = 'smart-review-view';

export class SmartReviewView extends ItemView {
    plugin: SmartReviewerPlugin;
    root: ReactDOM.Root | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: SmartReviewerPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_SMART_REVIEW;
    }

    getDisplayText() {
        return 'Tutor';
    }

    onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        const rootEl = container.createDiv();

        const context = {
            app: this.plugin.app,
            component: this,
            settings: this.plugin.settings,
            saveSettings: async () => {
                await this.plugin.saveSettings();
            }
        };

        this.root = ReactDOM.createRoot(rootEl);
        this.root.render(
            React.createElement(ReactApp, { context })
        );
        return Promise.resolve();
    }

    onClose(): Promise<void> {
        if (this.root) {
            this.root.unmount();
        }
        return Promise.resolve();
    }
}

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

        // Ensure the container handles height correctly
        // We cast to HTMLElement to access style, though Element usually works.
        (container as HTMLElement).style.height = '100%';
        (container as HTMLElement).style.overflow = 'hidden';
        (container as HTMLElement).style.padding = '0'; // Remove default padding if any, we handle it inside

        const rootEl = container.createDiv();
        rootEl.style.height = '100%';
        rootEl.style.display = 'flex';
        rootEl.style.flexDirection = 'column';
        rootEl.style.overflow = 'hidden';

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

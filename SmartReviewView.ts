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

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        const rootEl = container.createDiv();

        this.root = ReactDOM.createRoot(rootEl);
        this.root.render(
            React.createElement(ReactApp, { plugin: this.plugin })
        );
    }

    async onClose() {
        if (this.root) {
            this.root.unmount();
        }
    }
}

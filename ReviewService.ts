import { TFile, App } from 'obsidian';
import * as Diff from 'diff';
import * as LZString from 'lz-string';
import SmartReviewerPlugin from './main';
import { NoteReviewData } from './types';

export class ReviewService {
    plugin: SmartReviewerPlugin;
    app: App;

    constructor(app: App, plugin: SmartReviewerPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    async getNewContent(file: TFile): Promise<string> {
        const currentContent = await this.app.vault.read(file);
        const reviewData = this.plugin.settings.reviews?.[file.path];

        if (!reviewData || !reviewData.lastContentSnapshot) {
            return currentContent; // First time review, return full content
        }

        const lastContent = LZString.decompressFromUTF16(reviewData.lastContentSnapshot);
        
        if (!lastContent) {
             return currentContent; // Decompression failed or empty
        }

        const diffs = Diff.diffLines(lastContent, currentContent);
        
        let newContent = '';
        diffs.forEach((part) => {
            if (part.added) {
                newContent += part.value;
            }
        });

        return newContent;
    }

    async saveSnapshot(file: TFile, score: string) {
        const currentContent = await this.app.vault.read(file);
        const compressed = LZString.compressToUTF16(currentContent);
        
        if (!this.plugin.settings.reviews) {
            this.plugin.settings.reviews = {};
        }

        const existingHistory = this.plugin.settings.reviews[file.path]?.reviewHistory || [];

        this.plugin.settings.reviews[file.path] = {
            filePath: file.path,
            lastReviewedTime: Date.now(),
            lastContentSnapshot: compressed,
            reviewHistory: [
                ...existingHistory,
                { date: Date.now(), score: score }
            ]
        };

        await this.plugin.saveSettings();
    }
}

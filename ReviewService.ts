import { TFile, App, HeadingCache } from 'obsidian';
import * as Diff from 'diff';
import * as LZString from 'lz-string';
import { PluginSettings, NoteReviewData } from './types';

export class ReviewService {
    app: App;
    private settings: PluginSettings;
    private saveSettings: () => Promise<void>;

    constructor(app: App, settings: PluginSettings, saveSettings: () => Promise<void>) {
        this.app = app;
        this.settings = settings;
        this.saveSettings = saveSettings;
    }

    getHeadings(file: TFile): HeadingCache[] {
        const cache = this.app.metadataCache.getFileCache(file);
        return cache?.headings || [];
    }

    async getContentForHeadings(file: TFile, headings: HeadingCache[]): Promise<string> {
        const content = await this.app.vault.read(file);
        const allHeadings = this.getHeadings(file);
        let extractedContent = '';

        for (const heading of headings) {
            const startOffset = heading.position.end.offset;

            // Find the end index
            // The section ends at the start of the next heading of the same or higher level (lower number)
            // Or the end of the file
            let endOffset = content.length;

            const currentIndex = allHeadings.findIndex(h =>
                h.heading === heading.heading &&
                h.level === heading.level &&
                h.position.start.line === heading.position.start.line
            );

            if (currentIndex !== -1) {
                for (let i = currentIndex + 1; i < allHeadings.length; i++) {
                    const nextHeading = allHeadings[i];
                    if (nextHeading.level <= heading.level) {
                        endOffset = nextHeading.position.start.offset;
                        break;
                    }
                }
            }

            extractedContent += `\n\n--- Section: ${heading.heading} ---\n`;
            extractedContent += content.substring(startOffset, endOffset);
        }

        return extractedContent;
    }

    async getNewContent(file: TFile): Promise<string> {
        const currentContent = await this.app.vault.read(file);
        const reviewData: NoteReviewData | undefined = this.settings.reviews?.[file.path];

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

        if (!this.settings.reviews) {
            this.settings.reviews = {};
        }

        const existingHistory = this.settings.reviews[file.path]?.reviewHistory || [];

        this.settings.reviews[file.path] = {
            filePath: file.path,
            lastReviewedTime: Date.now(),
            lastContentSnapshot: compressed,
            reviewHistory: [
                ...existingHistory,
                { date: Date.now(), score: score }
            ]
        };

        await this.saveSettings();
    }
}

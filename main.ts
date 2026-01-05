import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { PluginSettings } from './types';
import { SmartReviewView, VIEW_TYPE_SMART_REVIEW } from './SmartReviewView';

const DEFAULT_SETTINGS: PluginSettings = {
    apiKey: '',
    apiBaseUrl: 'https://api.deepseek.com/v1',
    modelName: 'deepseek-chat',
    systemPromptQuiz: "You are a specialized learning assistant. Based strictly on the following text (which represents new updates to a user's note), generate 3 short, conceptual questions to test the user's understanding. Do not ask about trivial details like formatting. Return format: JSON list of strings.",
    systemPromptEvaluate: "You are a helpful tutor. The user was asked: '{question}'. They answered: '{userAnswer}'. The source text is: '{context}'. Evaluate their answer. 1. Score it from 0 to 10. 2. If wrong, correct them using ONLY the information in the source text. 3. Be concise.",
    reviews: {}
}

export default class SmartReviewerPlugin extends Plugin {
    settings: PluginSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_SMART_REVIEW,
            (leaf) => new SmartReviewView(leaf, this)
        );

        this.addCommand({
            id: 'open-smart-reviewer',
            name: 'Open Smart Reviewer',
            callback: () => {
                this.activateView();
            }
        });

        this.addSettingTab(new SmartReviewerSettingTab(this.app, this));
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_SMART_REVIEW);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for it
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: VIEW_TYPE_SMART_REVIEW, active: true });
            }
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SmartReviewerSettingTab extends PluginSettingTab {
    plugin: SmartReviewerPlugin;

    constructor(app: App, plugin: SmartReviewerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Tutor Settings' });

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Enter your OpenAI/DeepSeek API Key')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Base URL')
            .setDesc('Base URL for the LLM API (e.g., https://api.openai.com/v1)')
            .addText(text => text
                .setPlaceholder('https://api.openai.com/v1')
                .setValue(this.plugin.settings.apiBaseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.apiBaseUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Model Name')
            .setDesc('Model to use (e.g., gpt-3.5-turbo, deepseek-chat)')
            .addText(text => text
                .setPlaceholder('gpt-3.5-turbo')
                .setValue(this.plugin.settings.modelName)
                .onChange(async (value) => {
                    this.plugin.settings.modelName = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Prompts' });

        new Setting(containerEl)
            .setName('Quiz Generator Prompt')
            .setDesc('System prompt for generating questions.')
            .addTextArea(text => text
                .setPlaceholder('You are...')
                .setValue(this.plugin.settings.systemPromptQuiz)
                .onChange(async (value) => {
                    this.plugin.settings.systemPromptQuiz = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Answer Evaluator Prompt')
            .setDesc('System prompt for evaluating answers.')
            .addTextArea(text => text
                .setPlaceholder('You are...')
                .setValue(this.plugin.settings.systemPromptEvaluate)
                .onChange(async (value) => {
                    this.plugin.settings.systemPromptEvaluate = value;
                    await this.plugin.saveSettings();
                }));
    }
}

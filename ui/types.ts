import { App, Component } from 'obsidian';
import { PluginSettings } from '../types';

export interface TutorContext {
    app: App;
    component: Component;
    settings: PluginSettings;
    saveSettings: () => Promise<void>;
}

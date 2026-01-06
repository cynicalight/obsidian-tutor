export interface NoteReviewData {
    filePath: string;
    lastReviewedTime: number;
    lastContentSnapshot: string; // Compressed string
    reviewHistory: {
        date: number;
        score: string;
    }[];
}

export interface PluginSettings {
    apiKey: string;
    apiBaseUrl: string;
    modelName: string;
    language: string;
    systemPromptQuiz: string;
    systemPromptEvaluate: string;
    reviews: Record<string, NoteReviewData>;
}

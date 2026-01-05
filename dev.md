-- Active: 1751130996485@@sh-cynosdbmysql-grp-7wyx389e.sql.tencentcdb.com@21516
# Obsidian 插件开发指南：智能复习助手 Tutor

本指南旨在帮助你开发一个名为“智能复习助手”的 Obsidian 插件。该插件利用大语言模型（LLM）帮助用户复习笔记中的新增内容，并提供问答功能。以下是详细的设计方案和开发步骤。
### 1. 核心难点解决方案：如何识别“新增内容”？

你提到的疑虑是“识别新增内容是否可以被记录”。
**解决方案：快照对比法 (Snapshot Diff Strategy)**

由于 Obsidian 是本地 Markdown 文件，没有数据库记录每次修改。我们需要自己在插件的 `data.json` 中维护状态。

* **逻辑：**
1. 当用户点击“开始复习”并完成一轮问答后，插件将当前笔记的 **全文内容** 或 **Hash值** 存储到插件的数据库中，标记为 `last_reviewed_snapshot`。
2. 下一次点击“复习”时，插件读取当前文件内容，与 `last_reviewed_snapshot` 进行 `diff` 对比。
3. **提取差异：** 识别出所有新增的段落或行。
4. **容错：** 如果是第一次复习（没有快照），或者差异太小（只改了错别字），则对**全文**或**随机选取的章节**进行提问。


---

### 2. 项目架构设计 (Project Architecture)

在让 Copilot 写代码前，先定义好结构，防止代码乱成一团。

* **Tech Stack:** TypeScript, Obsidian API.
* **UI Framework:** 建议使用 **React** (Obsidian 插件开发主流) 或原生 DOM (如果想要极简)。考虑到有聊天界面，React 会更方便管理状态。
* **LLM Integration:** 使用 `fetch` 调用 OpenAI 格式接口 (兼容 DeepSeek/OpenAI/Claude)。

**数据结构 (`interface`):**

```typescript
interface NoteReviewData {
    filePath: string;
    lastReviewedTime: number;
    lastContentSnapshot: string; // 存文本副本，用于 diff
    reviewHistory: {
        date: number;
        score: string; // AI 给出的评价简述
    }[];
}

interface PluginSettings {
    apiKey: string;
    apiBaseUrl: string; // 允许自定义，方便接 DeepSeek/本地模型
    modelName: string;
    reminderInterval: number; // 分钟
}

```

---

### 3. 分步开发计划 (Copilot Prompts)

你可以按顺序将以下指令发给 Copilot。

#### 第一步：基础框架与设置页

> **Prompt:**
> "我正在开发一个 Obsidian 插件名为 'Smart Reviewer'。请帮我生成基础的 `main.ts` 结构。
> 1. 需要一个 `PluginSettings` 接口，包含 `apiKey`, `apiBaseUrl` (默认 [https://api.openai.com/v1](https://www.google.com/search?q=https://api.openai.com/v1)), `modelName`。
> 2. 实现一个设置页面 `SettingTab`，允许用户输入和保存这些配置。
> 3. 在 `onload` 中加载设置。"
> 
> 

#### 第二步：状态管理与 Diff 逻辑 (解决你的核心疑虑)

> **Prompt:**
> "我们需要一个服务来管理笔记的复习状态。请创建一个 `ReviewService` 类。
> 1. 使用 `diff` 库（假设我已安装 `diff` npm 包）来比较两个字符串。
> 2. 实现方法 `getNewContent(file: TFile): Promise<string>`。逻辑是：从 `data.json` 读取该文件上次复习时的快照。如果不存在，返回全文。如果存在，计算 Diff，返回所有新增或修改的行。
> 3. 实现方法 `saveSnapshot(file: TFile)`，将当前文件内容保存为最新快照。"
> 
> 

#### 第三步：LLM 服务层

> **Prompt:**
> "请创建一个 `LLMService` 类，封装大模型 API 调用。
> 1. 提供一个方法 `generateQuestions(context: string): Promise<string>`。System Prompt 应设定为：你是一个严厉的老师，根据提供的笔记内容，提出 3 个考察核心概念的问题。
> 2. 提供一个方法 `evaluateAnswer(question: string, userAnswer: string, noteContext: string): Promise<string>`。System Prompt：根据笔记原文，评价用户的回答，指出错误并给出正确解释。
> 3. 提供一个方法 `chatWithNote(query: string, noteContext: string): Promise<string>`。用于通用问答。"
> 
> 

#### 第四步：UI 界面 (侧边栏视图)

> **Prompt:**
> "请帮我创建一个 Obsidian 的 `ItemView` (侧边栏视图)，视图 ID 为 `smart-review-view`。
> 1. 视图内包含两个 Tab：'复习模式' 和 '问答模式'。
> 2. '复习模式'下：显示一个'开始复习'按钮。点击后调用 `ReviewService` 获取新增内容，然后调用 `LLMService` 生成问题，显示在界面上，并提供输入框让用户回答。
> 3. '问答模式'下：是一个标准的聊天窗口，用户输入问题，调用 `LLMService` 回答。"
> 
> 

#### 第五步：提醒功能 (可选)

> **Prompt:**
> "在 `main.ts` 中添加一个定时器逻辑。
> 1. 读取 `data.json` 中所有笔记的 `lastReviewedTime`。
> 2. 如果当前时间 - 上次复习时间 > 设置的间隔，使用 `new Notice()` 弹窗提醒用户复习具体的笔记名称。"
> 
> 

---

### 4. 关键的 System Prompts 设计

为了保证效果，你可以直接把这些 Prompt 硬编码到插件里：

* **生成问题 (Quiz Generator):**
> "You are a specialized learning assistant. Based strictly on the following text (which represents new updates to a user's note), generate 3 short, conceptual questions to test the user's understanding. Do not ask about trivial details like formatting. Return format: JSON list of strings."


* **评估回答 (Evaluator):**
> "You are a helpful tutor. The user was asked: '{question}'. They answered: '{userAnswer}'. The source text is: '{context}'.
> Evaluate their answer.


> 1. Score it from 0 to 10.
> 2. If wrong, correct them using ONLY the information in the source text.
> 3. Be concise."
> 
> 



---

### 5. 风险审计与建议

1. **Diff 算法开销**：如果笔记非常长（例如 5万字），每次打开都计算 Diff 可能会卡顿。
* *建议*：只在用户点击“开始复习”时才计算，不要在后台自动计算。


2. **API 成本**：如果笔记很长，直接把全文塞给 LLM 会消耗大量 Token。
* *建议*：在 `LLMService` 中截取新增内容。如果新增内容过少，则只截取当前光标所在的章节 (Heading)。


3. **Data.json 膨胀**：如果在 `data.json` 里存所有笔记的全文快照，插件数据文件会变得巨大，导致 Obsidian 启动变慢。
* *优化建议*：**不要存全文文本**。存文件内容的 `SHA-256` 哈希值来判断是否改变。但如果必须知道“哪里改了”，则建议只存“上次复习时的文件修改时间 (mtime)” + “上次复习时的全文”。如果担心体积，可以使用 LZString 压缩字符串后再存。



**下一步建议：**
你可以先创建一个空的 Obsidian 插件项目（使用 `obsidian-plugin-init`），然后按照我上面的“分步开发计划”中的第一步，直接让 Copilot 生成代码。需要我为你提供一段用于“初始化项目”的终端命令吗？
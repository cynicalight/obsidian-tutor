# 开发任务清单 (Task List)

## 1. 项目初始化与环境搭建 (Project Setup)
- [ ] **初始化项目结构**: 确保 `main.ts`, `manifest.json`, `styles.css` 等基础文件存在。
- [ ] **配置 React 环境**:
    - [ ] 安装 `react`, `react-dom`, `@types/react`, `@types/react-dom`。
    - [ ] 配置 `esbuild.config.mjs` 以支持 `.tsx` 文件编译。
- [ ] **配置基础设置 (Settings)**:
    - [ ] 定义 `PluginSettings` 接口 (API Key, Provider, Model Name, Prompt Templates)。
    - [ ] 实现 `SettingTab` 供用户配置。

## 2. 核心服务层开发 (Core Services)
- [ ] **LLMService (大模型服务)**:
    - [ ] 实现通用的 `fetch` 请求封装 (支持 OpenAI 兼容接口)。
      - 补充：我的本地环境配置了 Deepseek API Key（`$DEEPSEEK_API_KEY`），可以少量使用做测试。
    - [ ] 实现 `generateQuestions(diffContext)`: 生成复习题。
    - [ ] 实现 `evaluateAnswer(question, answer, context)`: 评分与反馈。
    - [ ] 实现 `chatWithNote(query, context)`: 通用问答。
- [ ] **ReviewService (复习状态管理)**:
    - [ ] 定义数据结构 `NoteReviewData`。
    - [ ] **实现快照存储**: 使用 `LZString` 压缩存储笔记快照到 `data.json` (避免体积膨胀)。
    - [ ] **实现 Diff 逻辑**: 引入 `diff` 库，实现 `getNewContent(file)` 方法，对比当前内容与上次快照。
    - [ ] 实现 `saveSnapshot(file)`: 更新复习时间和快照。

## 3. UI 开发 (React Views)
- [ ] **构建侧边栏视图容器 (ItemView)**:
    - [ ] 创建 `SmartReviewView.ts` 继承 `ItemView`。
    - [ ] 在 `onOpen` 中挂载 React Root，在 `onClose` 中卸载。
- [ ] **开发 React 组件**:
    - [ ] `App.tsx`: 主组件，管理 Tab 切换 (复习模式 vs 问答模式)。
    - [ ] `ReviewMode.tsx`:
        - [ ] 状态：`idle` (空闲), `loading` (生成中), `quiz` (答题中), `result` (结果)。
        - [ ] 显示新增内容摘要 (Diff 结果)。
        - [ ] 渲染问题卡片和输入框。
        - [ ] 渲染 AI 评分反馈。
    - [ ] `ChatMode.tsx`:
        - [ ] 标准聊天界面 (消息列表 + 输入框)。
        - [ ] 自动带入当前笔记上下文。

## 4. 整合与交互 (Integration)
- [ ] **命令注册**: 添加 "Open Smart Reviewer" 命令打开侧边栏。
- [ ] **事件监听**: (可选) 监听文件切换，自动更新视图中的“当前笔记”状态。
- [ ] **流程联调**:
    - [ ] 点击“开始复习” -> 获取 Diff -> 调用 LLM -> 显示问题。
    - [ ] 提交答案 -> 调用 LLM 评分 -> 显示结果 -> 更新快照。

## 5. 优化与测试 (Refinement)
- [ ] **错误处理**: API 失败、网络超时、Diff 为空时的 UI 提示。
- [ ] **性能优化**: 确保 `data.json` 读写不阻塞主线程 (虽然是同步的，但要注意数据量)。
- [ ] **样式美化**: 适配 Obsidian 主题 (Light/Dark mode)。

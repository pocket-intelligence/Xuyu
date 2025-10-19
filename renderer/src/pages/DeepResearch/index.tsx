import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Card, Typography, Spin, message, Space, Skeleton, List, Tag } from 'antd';
import { SearchOutlined, RobotOutlined, SendOutlined, LoadingOutlined, CheckCircleOutlined, LinkOutlined, FilePdfOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FormatSelectionOutput from '../../components/ResearchOutput/FormatSelectionOutput';
import MarkdownWithChartsOutput from '../../components/ResearchOutput/MarkdownWithChartsOutput';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface ProgressUpdate {
    step: number;
    data: any;
    stepInfo?: {
        title: string;
        description: string;
    };
}

interface InterruptData {
    question?: string;
    prompt?: string;
    query?: string;
    options?: string[];
}


// 步骤标题映射
const STEP_TITLES: Record<string, { title: string; icon: string; color: string }> = {
    askDetails: { title: '研究要点分析', icon: '💡', color: '#1890ff' },
    buildQuery: { title: '搜索关键词生成', icon: '🔍', color: '#52c41a' },
    search: { title: '搜索结果', icon: '🌐', color: '#13c2c2' },
    extractContent: { title: '页面内容抽取', icon: '📄', color: '#fa8c16' },
    // 深度报告流程
    coarseRead: { title: '粗读与主题抽取', icon: '👓', color: '#eb2f96' },
    craftOutline: { title: '生成报告大纲', icon: '📋', color: '#722ed1' },
    fillOutline: { title: '逐章填充内容', icon: '✍️', color: '#fa541c' },
    generateCharts: { title: '生成数据图表', icon: '📈', color: '#13c2c2' },
    // 最终报告生成（所有流程共用）
    writeReport: { title: '生成研究报告', icon: '📝', color: '#52c41a' },
};

// Markdown 自定义组件样式
const markdownComponents = {
    h1: ({ node, ...props }: any) => <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '16px', marginBottom: '12px', borderBottom: '2px solid #e8e8e8', paddingBottom: '8px' }} {...props} />,
    h2: ({ node, ...props }: any) => <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '14px', marginBottom: '10px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }} {...props} />,
    h3: ({ node, ...props }: any) => <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '12px', marginBottom: '8px' }} {...props} />,
    p: ({ node, ...props }: any) => <p style={{ marginBottom: '12px', lineHeight: '1.8' }} {...props} />,
    ul: ({ node, ...props }: any) => <ul style={{ marginLeft: '24px', marginBottom: '12px', lineHeight: '1.8' }} {...props} />,
    ol: ({ node, ...props }: any) => <ol style={{ marginLeft: '24px', marginBottom: '12px', lineHeight: '1.8' }} {...props} />,
    li: ({ node, ...props }: any) => <li style={{ marginBottom: '6px' }} {...props} />,
    strong: ({ node, ...props }: any) => <strong style={{ fontWeight: 600, color: '#262626' }} {...props} />,
    code: ({ node, inline, ...props }: any) =>
        inline
            ? <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', fontSize: '14px', color: '#d63384' }} {...props} />
            : <code style={{ display: 'block', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '6px', fontSize: '14px', overflow: 'auto', marginBottom: '12px' }} {...props} />,
    // 表格样式
    table: ({ node, ...props }: any) => (
        <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '16px',
            border: '1px solid #e8e8e8'
        }} {...props} />
    ),
    thead: ({ node, ...props }: any) => (
        <thead style={{ backgroundColor: '#fafafa' }} {...props} />
    ),
    th: ({ node, ...props }: any) => (
        <th style={{
            padding: '12px',
            textAlign: 'left',
            fontWeight: 600,
            borderRight: '1px solid #e8e8e8',
            borderBottom: '2px solid #e8e8e8'
        }} {...props} />
    ),
    tr: ({ node, ...props }: any) => (
        <tr style={{ borderBottom: '1px solid #e8e8e8' }} {...props} />
    ),
    td: ({ node, ...props }: any) => (
        <td style={{
            padding: '12px',
            borderRight: '1px solid #e8e8e8'
        }} {...props} />
    ),
};


const DeepResearch: React.FC = () => {
    const [topic, setTopic] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [stepDescription, setStepDescription] = useState<string>('等待开始...');
    const [interruptData, setInterruptData] = useState<InterruptData | null>(null);
    const [userInput, setUserInput] = useState<string>('');
    const [report, setReport] = useState<string>('');
    const [completed, setCompleted] = useState<boolean>(false);
    const [finishedTasks, setFinishedTasks] = useState<Array<{ name: string; result: string }>>([]);
    const [currentExecutingStep, setCurrentExecutingStep] = useState<string | null>(null);

    const isProcessingRef = useRef(false);

    // 监听进度更新
    useEffect(() => {
        const handleProgress = (...args: any[]) => {
            const progress = args[0] as ProgressUpdate;
            console.log('[前端] 收到进度更新:', progress);
            setCurrentStep(progress.step);
            if (progress.stepInfo) {
                setStepDescription(progress.stepInfo.description);
            }

            // 更新已完成任务列表
            if (progress.data?.state?.finished_tasks) {
                setFinishedTasks(progress.data.state.finished_tasks);
            }

            // 设置当前正在执行的步骤
            if (progress.data?.nodeName) {
                setCurrentExecutingStep(progress.data.nodeName);
            }

            // 不再从进度回调中设置 interruptData，因为会导致显示空数据
            // interruptData 直接从 invoke 返回的 inputPrompt 获取
        };

        window.electronAPI.on('agent-research-progress', handleProgress);

        return () => {
            window.electronAPI.removeListener('agent-research-progress', handleProgress);
        };
    }, []);

    // 开始研究
    const handleStartResearch = async () => {
        if (!topic.trim()) {
            message.warning('请输入研究主题');
            return;
        }

        if (isProcessingRef.current) {
            console.log('[前端] 已有任务在执行中，跳过');
            return;
        }

        isProcessingRef.current = true;
        setLoading(true);
        setCompleted(false);
        setReport('');
        setCurrentStep(0);
        setFinishedTasks([]);
        setStepDescription('正在创建研究会话...');
        setInterruptData(null);
        setCurrentExecutingStep(null);

        try {
            console.log('[前端] 创建研究会话...');
            const createResult = await window.electronAPI.invoke('create-research-session', { topic });

            if (!createResult.success) {
                throw new Error(createResult.message || '创建会话失败');
            }

            const newSessionId = createResult.sessionId;
            setSessionId(newSessionId);
            console.log('[前端] 会话创建成功:', newSessionId);

            // 开始执行
            console.log('[前端] 开始执行步骤...');
            setStepDescription('正在执行研究流程...');
            const stepResult = await window.electronAPI.invoke('execute-next-step', { sessionId: newSessionId });

            console.log('[前端] 执行结果:', stepResult);

            if (!stepResult.success) {
                throw new Error(stepResult.message || '执行失败');
            }

            // 更新已完成任务
            if (stepResult.state?.finished_tasks) {
                setFinishedTasks(stepResult.state.finished_tasks);
            }

            // 检查是否需要用户输入
            if (stepResult.needsInput) {
                console.log('[前端] 需要用户输入:', stepResult.inputPrompt);
                setInterruptData(stepResult.inputPrompt);
                setCurrentExecutingStep(null);
                setLoading(false);
                isProcessingRef.current = false;
            } else if (stepResult.completed) {
                console.log('[前端] 研究完成');
                setCompleted(true);
                setReport(stepResult.state.report || '没有生成报告');
                setStepDescription('研究完成！');
                setCurrentExecutingStep(null);
                setLoading(false);
                isProcessingRef.current = false;
                message.success('研究完成！');
            }
        } catch (error: any) {
            console.error('[前端] 研究失败:', error);
            message.error('研究失败: ' + error.message);
            setStepDescription('研究失败');
            setLoading(false);
            isProcessingRef.current = false;
        }
    };

    // 提交用户输入（文本输入）
    const handleSubmitInput = async () => {
        if (!sessionId) {
            message.warning('会话不存在');
            return;
        }

        if (isProcessingRef.current) {
            console.log('[前端] 已有任务在执行中，跳过');
            return;
        }

        isProcessingRef.current = true;
        setLoading(true);
        const currentInterruptData = interruptData;
        setInterruptData(null);
        setCurrentExecutingStep(null);

        try {
            console.log('[前端] 提交用户输入并恢复会话...');

            // 构造输入数据
            let input: any = {};
            if (currentInterruptData?.question) {
                // userReviewDetails 节点：用户审查研究细节
                input = { details: userInput || currentInterruptData.question };
            }

            console.log('[前端] 提交的输入数据:', input);

            const resumeResult = await window.electronAPI.invoke('submit-user-input', {
                sessionId,
                input
            });

            console.log('[前端] 恢复结果:', resumeResult);

            if (!resumeResult.success) {
                throw new Error(resumeResult.message || '恢复失败');
            }

            // 更新已完成任务
            if (resumeResult.state?.finished_tasks) {
                setFinishedTasks(resumeResult.state.finished_tasks);
            }

            // 检查是否需要用户输入
            if (resumeResult.needsInput) {
                console.log('[前端] 需要用户输入:', resumeResult.inputPrompt);
                setInterruptData(resumeResult.inputPrompt);
                setCurrentExecutingStep(null);
                setLoading(false);
                isProcessingRef.current = false;
            } else if (resumeResult.completed) {
                console.log('[前端] 研究完成');
                setCompleted(true);
                setReport(resumeResult.state.report || '没有生成报告');
                setStepDescription('研究完成！');
                setCurrentExecutingStep(null);
                setLoading(false);
                isProcessingRef.current = false;
                message.success('研究完成！');
            }

            setUserInput('');
        } catch (error: any) {
            console.error('[前端] 恢复会话失败:', error);
            message.error('恢复会话失败: ' + error.message);
            setStepDescription('恢复会话失败');
            setLoading(false);
            isProcessingRef.current = false;
        }
    };

    // 提交格式选择（按钮选择）
    const handleSelectFormat = async (format: string) => {
        if (!sessionId) {
            message.warning('会话不存在');
            return;
        }

        if (isProcessingRef.current) {
            console.log('[前端] 已有任务在执行中，跳过');
            return;
        }

        isProcessingRef.current = true;
        setLoading(true);
        setInterruptData(null);
        setCurrentExecutingStep(null);

        try {
            console.log('[前端] 提交格式选择并恢复会话...', format);

            const input = { output_format: format };
            console.log('[前端] 提交的输入数据:', input);

            const resumeResult = await window.electronAPI.invoke('submit-user-input', {
                sessionId,
                input
            });

            console.log('[前端] 恢复结果:', resumeResult);

            if (!resumeResult.success) {
                throw new Error(resumeResult.message || '恢复失败');
            }

            // 更新已完成任务
            if (resumeResult.state?.finished_tasks) {
                setFinishedTasks(resumeResult.state.finished_tasks);
            }

            // 检查是否需要用户输入
            if (resumeResult.needsInput) {
                console.log('[前端] 需要用户输入:', resumeResult.inputPrompt);
                setInterruptData(resumeResult.inputPrompt);
                setCurrentExecutingStep(null);
                setLoading(false);
                isProcessingRef.current = false;
            } else if (resumeResult.completed) {
                console.log('[前端] 研究完成');
                setCompleted(true);
                setReport(resumeResult.state.report || '没有生成报告');
                setStepDescription('研究完成！');
                setCurrentExecutingStep(null);
                setLoading(false);
                isProcessingRef.current = false;
                message.success('研究完成！');
            }
        } catch (error: any) {
            console.error('[前端] 恢复会话失败:', error);
            message.error('恢复会话失败: ' + error.message);
            setStepDescription('恢复会话失败');
            setLoading(false);
            isProcessingRef.current = false;
        }
    };

    // 重置研究
    const handleReset = () => {
        setTopic('');
        setSessionId(null);
        setCurrentStep(0);
        setStepDescription('等待开始...');
        setInterruptData(null);
        setUserInput('');
        setReport('');
        setCompleted(false);
        setFinishedTasks([]);
        setCurrentExecutingStep(null);
        setLoading(false);
        isProcessingRef.current = false;
    };

    // 导出 PDF 报告
    const handleExportPdf = async () => {
        if (!sessionId || !report) {
            message.warning('没有可导出的报告');
            return;
        }

        setLoading(true);
        try {
            console.log('[前端] 导出 PDF 报告...');
            const result = await window.electronAPI.invoke('export-pdf-report', {
                sessionId,
                topic
            });

            if (!result.success) {
                throw new Error(result.message || '导出失败');
            }

            message.success('报告已导出，正在打开文件位置...');

            // 打开文件所在目录
            await window.electronAPI.invoke('open-pdf-location', { pdfPath: result.pdfPath });
        } catch (error: any) {
            console.error('[前端] 导出 PDF 失败:', error);
            message.error('导出 PDF 失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="deep-research-container">
            <Card className="research-card">
                <div className="header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <RobotOutlined style={{ fontSize: 32, marginRight: 8 }} />
                        <Title level={2} style={{ margin: 0 }}>深度研究智能体</Title>
                    </div>
                </div>

                <div style={{ marginTop: 16, marginBottom: 16 }}></div>

                {!sessionId ? (
                    <>
                        <Paragraph>请输入您想要研究的主题，AI 将帮您进行深度分析。</Paragraph>
                        <div className="input-section">
                            <Input
                                placeholder="例如：人工智能的发展趋势"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onPressEnter={handleStartResearch}
                                size="large"
                                prefix={<SearchOutlined />}
                                disabled={loading}
                            />
                            <div style={{ marginTop: 16, marginBottom: 16 }}></div>
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleStartResearch}
                                loading={loading}
                                icon={<SearchOutlined />}
                            >
                                开始研究
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            <div>
                                <Text strong>研究主题：</Text>
                                <Text>{topic}</Text>
                            </div>

                            {/* 显示所有任务（统一使用 Markdown 渲染） */}
                            {finishedTasks
                                .filter(task => !task.name.startsWith('user'))
                                .map((task, index) => {

                                    const stepInfo = STEP_TITLES[task.name];
                                    const isReport = task.name === 'writeReport';
                                    const isSearch = task.name === 'search';

                                    // 如果是搜索结果，尝试解析 JSON
                                    let searchResults: any[] = [];
                                    if (isSearch) {
                                        // 检查结果是否为空
                                        if (!task.result || task.result.trim() === '') {
                                            searchResults = [];
                                        } else {
                                            try {
                                                searchResults = JSON.parse(task.result);
                                            } catch (e) {
                                                console.error('[前端] 解析搜索结果失败:', e);
                                                searchResults = [];
                                            }
                                        }
                                    }

                                    return (
                                        <Card
                                            key={index}
                                            size="small"
                                            style={{
                                                borderLeft: `4px solid ${stepInfo?.color || '#1890ff'}`,
                                                backgroundColor: isReport ? '#f9f0ff' : '#fafafa'
                                            }}
                                            title={
                                                <Space>
                                                    <CheckCircleOutlined style={{ color: stepInfo?.color || '#52c41a' }} />
                                                    <Text strong style={{ fontSize: isReport ? '16px' : '14px' }}>
                                                        {stepInfo?.icon || '✓'} {stepInfo?.title || task.name}
                                                    </Text>
                                                </Space>
                                            }
                                        >
                                            <div style={{ padding: '12px 0' }}>
                                                {isSearch ? (
                                                    searchResults.length > 0 ? (
                                                        <List
                                                            dataSource={searchResults}
                                                            renderItem={(item: any) => (
                                                                <Card style={{ marginBottom: 12, padding: 16 }}>
                                                                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                                                                        {/* 标题 + Tag */}
                                                                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                                                            {item.keyword && <Tag color="blue" style={{ fontSize: 12 }}>{item.keyword}</Tag>}
                                                                            <Title level={4} style={{ margin: 0 }}>
                                                                                #{item.index} {item.title}
                                                                            </Title>
                                                                        </Space>

                                                                        {/* 描述内容 */}
                                                                        <div style={{ marginTop: 8, flex: 1 }}>
                                                                            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                                                                                {item.url}
                                                                            </Text>
                                                                            <Text style={{ lineHeight: 1.6 }}>{item.content}</Text>
                                                                        </div>

                                                                        {/* 按钮靠右底部 */}
                                                                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                                                                            <Button
                                                                                type="link"
                                                                                icon={<LinkOutlined />}
                                                                                onClick={() => window.electronAPI.invoke("open-external-url", { url: item.url })}
                                                                            >
                                                                                打开链接
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            )}
                                                        />
                                                    ) : (
                                                        <Text type="secondary">暂无搜索结果</Text>
                                                    )
                                                ) : isReport ? (
                                                    <MarkdownWithChartsOutput content={task.result || ''} />
                                                ) : (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={markdownComponents}
                                                    >
                                                        {task.result}
                                                    </ReactMarkdown>
                                                )}
                                            </div>
                                            {isReport && completed && (
                                                <Space style={{ marginTop: 16 }}>
                                                    <Button
                                                        type="primary"
                                                        icon={<FilePdfOutlined />}
                                                        size="large"
                                                        onClick={handleExportPdf}
                                                        loading={loading}
                                                    >
                                                        导出 PDF 报告
                                                    </Button>
                                                    <Button
                                                        onClick={handleReset}
                                                        size="large"
                                                    >
                                                        开始新研究
                                                    </Button>
                                                </Space>
                                            )}
                                        </Card>
                                    );
                                })}

                            {/* 显示当前正在执行的步骤 - loading 动效 */}
                            {currentExecutingStep && !completed && !interruptData && (
                                <Card
                                    size="small"
                                    style={{
                                        borderLeft: `4px solid ${STEP_TITLES[currentExecutingStep]?.color || '#faad14'}`,
                                        backgroundColor: '#fffbf0'
                                    }}
                                    title={
                                        <Space>
                                            <Spin indicator={<LoadingOutlined spin />} />
                                            <Text strong style={{ color: STEP_TITLES[currentExecutingStep]?.color || '#faad14' }}>
                                                {STEP_TITLES[currentExecutingStep]?.icon || '⏳'} {STEP_TITLES[currentExecutingStep]?.title || currentExecutingStep}
                                            </Text>
                                        </Space>
                                    }
                                >
                                    <Skeleton active paragraph={{ rows: 2 }} />
                                </Card>
                            )}
                        </Space>
                    </>
                )}
            </Card>

            {/* 用户输入区域 - 根据类型显示不同的组件 */}
            {interruptData && !completed && sessionId && (
                <>
                    {/* 格式选择 - 显示按钮卡片 */}
                    {interruptData.options && interruptData.options.length > 0 ? (
                        <FormatSelectionOutput
                            options={interruptData.options}
                            onSelect={handleSelectFormat}
                            loading={loading}
                        />
                    ) : (
                        /* 文本输入 - 显示输入框 */
                        <Card
                            style={{
                                marginTop: 24,
                                borderColor: '#1890ff',
                                borderWidth: 2,
                                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)'
                            }}
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <div style={{
                                    padding: '12px 16px',
                                    backgroundColor: '#e6f7ff',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #1890ff'
                                }}>
                                    <Text strong style={{ color: '#0050b3', fontSize: '15px' }}>
                                        ⏸️ 需要您的输入
                                    </Text>
                                    <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
                                        请在下方输入您的回复，或留空使用默认值
                                    </Paragraph>
                                </div>

                                <TextArea
                                    rows={4}
                                    placeholder={interruptData.question ? "请输入您的研究细节补充..." : "请输入您的回复..."}
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    disabled={loading}
                                    autoFocus
                                    style={{ fontSize: '14px' }}
                                    onKeyDown={(e) => {
                                        if (e.ctrlKey && e.key === 'Enter') {
                                            handleSubmitInput();
                                        }
                                    }}
                                />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: '13px' }}>
                                        💡 提示：按 Ctrl+Enter 快速提交
                                    </Text>
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={handleSubmitInput}
                                        loading={loading}
                                        icon={<SendOutlined />}
                                    >
                                        提交并继续
                                    </Button>
                                </div>
                            </Space>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default DeepResearch;

import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Card, Typography, Spin, message, Steps, Space } from 'antd';
import { SearchOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

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

// 步骤定义
const STEPS = [
    { title: '询问细节', description: '生成研究细节建议' },
    { title: '审查细节', description: '用户审查研究细节' },
    { title: '构建查询', description: '生成搜索关键词' },
    { title: '选择格式', description: '用户选择输出格式' },
    { title: '执行搜索', description: '搜索相关资料' },
    { title: '生成报告', description: '生成研究报告' },
];

const DeepResearch: React.FC = () => {
    const [topic, setTopic] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [stepDescription, setStepDescription] = useState<string>('等待开始...');
    const [interruptData, setInterruptData] = useState<any>(null);
    const [userInput, setUserInput] = useState<string>('');
    const [report, setReport] = useState<string>('');
    const [completed, setCompleted] = useState<boolean>(false);
    const [finishedTasks, setFinishedTasks] = useState<Array<{ name: string; result: string }>>([]);

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

            // 检查是否是中断数据（需要用户输入）
            if (progress.data && (progress.data.question || progress.data.query || progress.data.prompt)) {
                console.log('[前端] 检测到中断数据，需要用户输入:', progress.data);
                setInterruptData(progress.data);
                setLoading(false);
                isProcessingRef.current = false;
            }
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
                setLoading(false);
                isProcessingRef.current = false;
            } else if (stepResult.completed) {
                console.log('[前端] 研究完成');
                setCompleted(true);
                setReport(stepResult.state.report || '没有生成报告');
                setStepDescription('研究完成！');
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

    // 提交用户输入
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

        try {
            console.log('[前端] 提交用户输入并恢复会话...');

            // 构造输入数据
            let input: any = {};
            if (currentInterruptData?.question) {
                // userReviewDetails 节点：用户审查研究细节
                input = { details: userInput || currentInterruptData.question };
            } else if (currentInterruptData?.query) {
                // userChooseFormat 节点：用户选择输出格式
                input = { output_format: userInput || 'markdown' };
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
                setLoading(false);
                isProcessingRef.current = false;
            } else if (resumeResult.completed) {
                console.log('[前端] 研究完成');
                setCompleted(true);
                setReport(resumeResult.state.report || '没有生成报告');
                setStepDescription('研究完成！');
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
        setLoading(false);
        isProcessingRef.current = false;
    };

    return (
        <div className="deep-research-container">
            <Card className="research-card">
                <div className="header">
                    <RobotOutlined className="icon" />
                    <Title level={2}>深度研究智能体</Title>
                </div>

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

                            <div className="progress-section">
                                <Steps
                                    current={Math.min(finishedTasks.length, STEPS.length - 1)}
                                    items={STEPS}
                                    size="small"
                                />
                                <div className="step-description">
                                    {loading && <Spin size="small" />}
                                    <Text type="secondary">{stepDescription}</Text>
                                </div>
                            </div>

                            {/* 显示已完成的任务 */}
                            {finishedTasks.length > 0 && (
                                <Card type="inner" title="执行记录" size="small">
                                    {finishedTasks.map((task, index) => (
                                        <div key={index} style={{ marginBottom: 8 }}>
                                            <Text strong>{task.name}:</Text>
                                            <Paragraph
                                                style={{ marginLeft: 16, marginBottom: 8 }}
                                                ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                                            >
                                                {task.result}
                                            </Paragraph>
                                        </div>
                                    ))}
                                </Card>
                            )}

                            {/* 用户输入区域 */}
                            {/* AI建议/查询显示区域 - 只显示内容，不包含输入框 */}
                            {interruptData && !completed && (
                                <Card
                                    type="inner"
                                    title={interruptData.question ? "AI 建议" : "搜索关键词"}
                                    style={{ backgroundColor: '#f0f9ff', borderColor: '#1890ff' }}
                                >
                                    {interruptData.question && (
                                        <div className="interrupt-content">
                                            <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: '15px', lineHeight: '1.8' }}>
                                                {interruptData.question}
                                            </Paragraph>
                                            <Paragraph type="secondary" style={{ marginTop: 12 }}>
                                                💡 {interruptData.prompt}
                                            </Paragraph>
                                        </div>
                                    )}
                                    {interruptData.query && (
                                        <div className="interrupt-content">
                                            <Paragraph style={{ fontSize: '15px', fontWeight: 500 }}>
                                                {interruptData.query}
                                            </Paragraph>
                                            <Paragraph type="secondary" style={{ marginTop: 12 }}>
                                                💡 {interruptData.prompt}
                                            </Paragraph>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* 研究报告 */}
                            {completed && report && (
                                <Card type="inner" title="研究报告" className="report-section">
                                    <ReactMarkdown>{report}</ReactMarkdown>
                                    <Button
                                        onClick={handleReset}
                                        style={{ marginTop: 16 }}
                                    >
                                        开始新研究
                                    </Button>
                                </Card>
                            )}
                        </Space>
                    </>
                )}
            </Card>

            {/* 用户输入区域 - 始终显示在页面最下方 */}
            {interruptData && !completed && sessionId && (
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
                            placeholder={interruptData.question ? "请输入您的研究细节补充..." : "请输入输出格式（markdown/plain/json）或留空使用默认值..."}
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
        </div>
    );
};

export default DeepResearch;

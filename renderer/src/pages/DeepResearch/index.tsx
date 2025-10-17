import React, { useState } from 'react';
import { Card, Typography, Input, Button, Space, Spin, Alert, message } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import ResearchOutputRenderer from '../../components/ResearchOutput/ResearchOutputRenderer';

const { Title, Text } = Typography;

// 定义输出接口
interface ResearchOutput {
    type: string;
    content: unknown;
    metadata?: Record<string, unknown>;
}

// 定义 Agent 研究进度数据接口
interface AgentResearchProgressData {
    step: number;
    data: ResearchOutput;
    // 新增动态步骤信息
    stepInfo?: {
        title: string;
        description: string;
    };
}

// 定义 Agent 研究结果接口
interface AgentResearchResultData {
    success: boolean;
    message?: string;
    data?: unknown;
}

const DeepResearchPage: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [currentStep, setCurrentStep] = useState(-1);
    const [stepsInfo, setStepsInfo] = useState<Array<{ title: string, description: string }>>([]);
    const [stepOutputs, setStepOutputs] = useState<Record<number, ResearchOutput>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // 用户输入状态
    const [waitingForInput, setWaitingForInput] = useState(false);

    // 调用后端智能体
    const startResearch = async () => {
        if (!topic.trim()) {
            message.error('请输入研究主题');
            return;
        }

        setLoading(true);
        setError('');
        setCurrentStep(-1);
        setStepsInfo([]);
        setStepOutputs({});
        setWaitingForInput(false);

        try {
            // 注册进度回调
            window.electronAPI.onAgentResearchProgress((data: AgentResearchProgressData) => {
                const { step, data: stepData, stepInfo } = data;
                setCurrentStep(step);

                // 更新步骤信息
                if (stepInfo) {
                    setStepsInfo(prev => {
                        const newSteps = [...prev];
                        newSteps[step] = stepInfo;
                        return newSteps;
                    });
                }

                // 更新步骤输出
                setStepOutputs(prev => ({
                    ...prev,
                    [step]: stepData
                }));

                // 检查是否需要等待用户输入
                if (stepData.type === 'wait-for-user-input') {
                    setWaitingForInput(true);
                }
            });

            // 启动研究
            window.electronAPI.startAgentResearch({ topic }, (result: AgentResearchResultData) => {
                setLoading(false);
                if (result.success) {
                    setCurrentStep(stepsInfo.length);
                    message.success('研究完成');
                } else {
                    setError(result.message || '研究过程中出现错误');
                }
            });
        } catch (err) {
            setLoading(false);
            setError('研究过程中出现错误，请稍后重试');
            console.error(err);
        }
    };

    // 处理用户输入提交
    const handleUserInputSubmit = () => {
        // 这里应该发送用户输入到后端继续处理
        // 暂时只是关闭输入状态
        setWaitingForInput(false);
        message.success('输入已提交');
    };

    // 获取步骤的加载状态消息
    const getStepLoadingMessage = (step: number) => {
        const defaultMessages = [
            '正在分析研究主题...',
            '正在生成搜索关键词...',
            '正在搜索相关资料...',
            '正在生成研究报告...'
        ];
        return defaultMessages[step] || '正在处理...';
    };

    return (
        <div className="p-4">
            <Title level={2}>深度研究</Title>
            <Text type="secondary">输入研究主题，系统将自动拆解问题并生成研究报告</Text>

            <Card className="mt-6">
                <Space direction="vertical" size="large" className="w-full">
                    <Input
                        size="large"
                        placeholder="请输入研究主题，例如：人工智能对就业市场的影响"
                        prefix={<SearchOutlined />}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onPressEnter={startResearch}
                        disabled={loading}
                    />
                    <Button
                        type="primary"
                        size="large"
                        className="self-start"
                        onClick={startResearch}
                        loading={loading}
                        disabled={loading}
                    >
                        开始研究
                    </Button>
                </Space>
            </Card>

            {error && (
                <Alert
                    message="错误"
                    description={error}
                    type="error"
                    showIcon
                    className="mt-4"
                />
            )}

            {/* 用户输入模态框 */}
            {waitingForInput && (
                <Card className="mt-6 animate-fadeIn">
                    <Title level={4}>
                        <FileTextOutlined className="mr-2" />
                        等待用户输入
                    </Title>
                    <div className="mt-4">
                        <ResearchOutputRenderer
                            output={stepOutputs[currentStep]}
                            onUserInputSubmit={handleUserInputSubmit}
                        />
                    </div>
                </Card>
            )}

            {/* 动态步骤进度条 - 只在研究开始后显示 */}
            {currentStep >= 0 && stepsInfo.length > 0 && !waitingForInput && (
                <Card className="mt-6">
                    {stepsInfo.map((step, index) => (
                        <div key={index} className="flex items-center mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${index < currentStep ? 'bg-green-500 text-white' :
                                    index === currentStep ? 'bg-blue-500 text-white' :
                                        'bg-gray-200 text-gray-500'
                                }`}>
                                {index + 1}
                            </div>
                            <div>
                                <div className="font-medium">{step.title}</div>
                                <div className="text-sm text-gray-500">{step.description}</div>
                            </div>
                        </div>
                    ))}
                </Card>
            )}

            {/* 动态步骤内容 - 根据实际步骤动态渲染 */}
            {!waitingForInput && stepsInfo.map((stepInfo, index) => (
                (currentStep >= index || stepOutputs[index]) && (
                    <Card key={index} className="mt-6 animate-fadeIn">
                        <Title level={4}>
                            <FileTextOutlined className="mr-2" />
                            {stepInfo.title}
                        </Title>
                        {stepOutputs[index] ? (
                            <div className="mt-4">
                                <ResearchOutputRenderer output={stepOutputs[index]} />
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Spin />
                                <div className="mt-2">{getStepLoadingMessage(index)}</div>
                            </div>
                        )}
                    </Card>
                )
            ))}

            {/* 完成 - 只在研究完成时显示 */}
            {currentStep >= stepsInfo.length && stepsInfo.length > 0 && !waitingForInput && (
                <Card className="mt-6 animate-fadeIn">
                    <Title level={4}>
                        <FileTextOutlined className="mr-2" />
                        研究完成
                    </Title>
                    <div className="mt-4">
                        <Text>研究已完成，报告已生成。</Text>
                        <Button type="primary" className="ml-4">
                            保存报告
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default DeepResearchPage;
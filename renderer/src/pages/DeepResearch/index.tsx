import React, { useState } from 'react';
import { Card, Typography, Input, Button, Space, Steps, List, Divider, Spin, Alert, message } from 'antd';
import { SearchOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const { Title, Text } = Typography;
const { Step } = Steps;

const DeepResearchPage: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [currentStep, setCurrentStep] = useState(-1);
    const [details, setDetails] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    // 调用后端智能体
    const startResearch = async () => {
        if (!topic.trim()) {
            message.error('请输入研究主题');
            return;
        }

        setLoading(true);
        setError('');
        setCurrentStep(-1);
        setCompletedSteps([]);
        setDetails('');
        setQuery('');
        setResults([]);
        setReport('');

        try {
            // 注册进度回调
            window.electronAPI.onAgentResearchProgress((data) => {
                const { step, data: stepData } = data;
                setCurrentStep(step);
                setCompletedSteps(prev => [...prev, step]);

                switch (step) {
                    case 0: // 询问细节
                        if (stepData.details) setDetails(stepData.details);
                        break;
                    case 1: // 构建查询
                        if (stepData.query) setQuery(stepData.query);
                        break;
                    case 2: // 执行搜索
                        if (stepData.results) setResults(stepData.results);
                        break;
                    case 3: // 生成报告
                        if (stepData.report) setReport(stepData.report);
                        break;
                }
            });

            // 启动研究
            window.electronAPI.startAgentResearch({ topic }, (result) => {
                setLoading(false);
                if (result.success) {
                    setCurrentStep(4);
                    setCompletedSteps(prev => [...prev, 4]);
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

            {/* 步骤进度条 - 只在研究开始后显示 */}
            {currentStep >= 0 && (
                <Card className="mt-6">
                    <Steps current={currentStep} className="mb-6">
                        <Step title="询问细节" description="了解研究需求" />
                        <Step title="构建查询" description="生成搜索关键词" />
                        <Step title="执行搜索" description="获取相关资料" />
                        <Step title="生成报告" description="撰写研究报告" />
                        <Step title="完成" description="研究结束" />
                    </Steps>
                </Card>
            )}

            {/* 步骤1: 询问细节 - 只在当前步骤或已完成时显示 */}
            {(currentStep >= 0 || completedSteps.includes(0)) && (
                <Card className="mt-6 animate-fadeIn">
                    <Title level={4}>
                        <FileTextOutlined className="mr-2" />
                        1. 询问细节
                    </Title>
                    {details ? (
                        <div className="mt-4">
                            <Text>{details}</Text>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <Spin />
                            <div className="mt-2">正在分析研究主题...</div>
                        </div>
                    )}
                </Card>
            )}

            {/* 步骤2: 构建查询 - 只在当前步骤或已完成时显示 */}
            {(currentStep >= 1 || completedSteps.includes(1)) && (
                <Card className="mt-6 animate-fadeIn">
                    <Title level={4}>
                        <FileTextOutlined className="mr-2" />
                        2. 构建查询
                    </Title>
                    {query ? (
                        <div className="mt-4">
                            <Text strong>生成的查询关键词：</Text>
                            <Text code>{query}</Text>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <Spin />
                            <div className="mt-2">正在生成搜索关键词...</div>
                        </div>
                    )}
                </Card>
            )}

            {/* 步骤3: 执行搜索 - 只在当前步骤或已完成时显示 */}
            {(currentStep >= 2 || completedSteps.includes(2)) && (
                <Card className="mt-6 animate-fadeIn">
                    <Title level={4}>
                        <FileTextOutlined className="mr-2" />
                        3. 执行搜索
                    </Title>
                    {results.length > 0 ? (
                        <div className="mt-4">
                            <Text strong>找到 {results.length} 个相关结果：</Text>
                            <List
                                className="mt-4"
                                bordered
                                dataSource={results}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div className="w-full">
                                            <div className="flex justify-between items-start">
                                                <Text strong>{item.title}</Text>
                                                <Button
                                                    type="link"
                                                    icon={<LinkOutlined />}
                                                    href={item.url}
                                                    target="_blank"
                                                >
                                                    访问
                                                </Button>
                                            </div>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <Spin />
                            <div className="mt-2">正在搜索相关资料...</div>
                        </div>
                    )}
                </Card>
            )}

            {/* 步骤4: 生成报告 - 只在当前步骤或已完成时显示 */}
            {(currentStep >= 3 || completedSteps.includes(3)) && (
                <Card className="mt-6 animate-fadeIn">
                    <Title level={4}>
                        <FileTextOutlined className="mr-2" />
                        4. 生成报告
                    </Title>
                    {report ? (
                        <div className="mt-4">
                            {/* <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded">
                                {report}
                            </pre> */}
                            <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <Spin />
                            <div className="mt-2">正在生成研究报告...</div>
                        </div>
                    )}
                </Card>
            )}

            {/* 完成 - 只在研究完成时显示 */}
            {currentStep === 4 && (
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
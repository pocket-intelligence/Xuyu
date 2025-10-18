import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Space, Tag, Button, Modal, Descriptions, Timeline, Statistic, Row, Col, message, Tooltip } from 'antd';
import { HistoryOutlined, EyeOutlined, DeleteOutlined, ClockCircleOutlined, ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const { Title, Text, Paragraph } = Typography;

interface AgentSession {
    id: number;
    sessionId: string;
    topic: string;
    outputFormat: string;
    status: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    finishedTasks: string;
    finalReport: string | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
}

interface AgentStepLog {
    id: number;
    stepName: string;
    status: string;
    inputData: string | null;
    outputResult: string | null;
    inputTokens: number;
    outputTokens: number;
    modelName: string | null;
    duration: number | null;
    errorMessage: string | null;
    executionLog: string | null;
    createdAt: string;
    completedAt: string | null;
}

// 步骤名称映射
const STEP_NAMES: Record<string, string> = {
    askDetails: '💡 生成研究细节',
    userReviewDetails: '👤 用户审查细节',
    buildQuery: '🔍 生成搜索关键词',
    userChooseFormat: '👤 选择输出格式',
    search: '🌐 执行搜索',
    writeReport: '📝 生成报告'
};

const SearchRecordsPage: React.FC = () => {
    const [sessions, setSessions] = useState<AgentSession[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
    const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null);
    const [stepLogs, setStepLogs] = useState<AgentStepLog[]>([]);
    const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);
    const [selectedReport, setSelectedReport] = useState<string>('');

    // 加载会话列表
    const loadSessions = async () => {
        setLoading(true);
        try {
            const result = await window.electronAPI.invoke('get-agent-sessions', {});
            if (result.success) {
                setSessions(result.data || []);
            } else {
                message.error('加载会话列表失败: ' + result.message);
            }
        } catch (error: any) {
            message.error('加载失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    // 查看详情
    const handleViewDetail = async (session: AgentSession) => {
        setSelectedSession(session);
        setDetailModalVisible(true);

        try {
            const result = await window.electronAPI.invoke('get-agent-session-detail', {
                sessionId: session.sessionId
            });
            if (result.success && result.data) {
                setStepLogs(result.data.steps || []);
            } else {
                message.error('加载步骤详情失败');
                setStepLogs([]);
            }
        } catch (error: any) {
            message.error('加载详情失败: ' + error.message);
            setStepLogs([]);
        }
    };

    // 删除会话
    const handleDelete = async (sessionId: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个会话记录吗？此操作不可恢复。',
            okText: '确定',
            cancelText: '取消',
            okType: 'danger',
            onOk: async () => {
                try {
                    const result = await window.electronAPI.invoke('delete-agent-session', { sessionId });
                    if (result.success) {
                        message.success('删除成功');
                        loadSessions();
                    } else {
                        message.error('删除失败: ' + result.message);
                    }
                } catch (error: any) {
                    message.error('删除失败: ' + error.message);
                }
            }
        });
    };

    // 查看报告
    const handleViewReport = (report: string) => {
        setSelectedReport(report);
        setReportModalVisible(true);
    };

    // 获取状态标签
    const getStatusTag = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
            running: { color: 'processing', icon: <SyncOutlined spin />, text: '运行中' },
            completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
            failed: { color: 'error', icon: <CloseCircleOutlined />, text: '已失败' },
            cancelled: { color: 'default', icon: <CloseCircleOutlined />, text: '已取消' }
        };
        const config = statusConfig[status] || statusConfig.running;
        return (
            <Tag color={config.color} icon={config.icon}>
                {config.text}
            </Tag>
        );
    };

    // 获取步骤状态颜色
    const getStepStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            running: 'blue',
            success: 'green',
            failed: 'red',
            skipped: 'gray'
        };
        return colors[status] || 'gray';
    };

    const columns = [
        {
            title: '研究主题',
            dataIndex: 'topic',
            key: 'topic',
            width: 300,
            render: (topic: string) => (
                <Tooltip title={topic}>
                    <Text strong ellipsis style={{ maxWidth: 280, display: 'block' }}>
                        {topic}
                    </Text>
                </Tooltip>
            )
        },
        {
            title: '输出格式',
            dataIndex: 'outputFormat',
            key: 'outputFormat',
            width: 120,
            render: (format: string) => {
                const formatConfig: Record<string, { color: string; icon: string }> = {
                    '直接问答': { color: 'green', icon: '💬' },
                    '深度报告': { color: 'blue', icon: '📄' },
                    '结构化输出': { color: 'purple', icon: '🗂️' }
                };
                const config = formatConfig[format] || { color: 'default', icon: '📝' };
                return <Tag color={config.color}>{config.icon} {format}</Tag>;
            }
        },
        {
            title: 'Token使用',
            key: 'tokens',
            width: 120,
            render: (_: any, record: AgentSession) => (
                <Text>
                    <ThunderboltOutlined /> {record.totalTokens.toLocaleString()}
                </Text>
            )
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => getStatusTag(status)
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (date: string) => new Date(date).toLocaleString('zh-CN')
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: any, record: AgentSession) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                    >
                        查看
                    </Button>
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.sessionId)}
                    >
                        删除
                    </Button>
                </Space>
            )
        }
    ];

    // 统计数据
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);

    return (
        <div className="p-4">
            <div style={{ marginBottom: 16 }}>
                <Title level={2}>
                    <HistoryOutlined className="mr-2" />
                    智能体调用记录
                </Title>
                <Text type="secondary">查看所有研究会话的详细记录、Token使用和执行日志</Text>
            </div>

            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="总会话数"
                            value={totalSessions}
                            prefix={<HistoryOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="完成数"
                            value={completedSessions}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="总Token数"
                            value={totalTokens}
                            prefix={<ThunderboltOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 会话列表 */}
            <Card>
                <Table
                    dataSource={sessions}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`
                    }}
                />
            </Card>

            {/* 详情弹窗 */}
            <Modal
                title="会话详情"
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                width={900}
                footer={[
                    <Button key="close" onClick={() => setDetailModalVisible(false)}>
                        关闭
                    </Button>,
                    selectedSession?.finalReport && (
                        <Button
                            key="report"
                            type="primary"
                            onClick={() => handleViewReport(selectedSession.finalReport!)}
                        >
                            查看报告
                        </Button>
                    )
                ]}
            >
                {selectedSession && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        {/* 基本信息 */}
                        <Descriptions title="基本信息" bordered column={2}>
                            <Descriptions.Item label="会话ID" span={2}>
                                <Text code copyable>{selectedSession.sessionId}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="研究主题" span={2}>
                                {selectedSession.topic}
                            </Descriptions.Item>
                            <Descriptions.Item label="输出格式">
                                {selectedSession.outputFormat}
                            </Descriptions.Item>
                            <Descriptions.Item label="状态">
                                {getStatusTag(selectedSession.status)}
                            </Descriptions.Item>
                            <Descriptions.Item label="创建时间">
                                {new Date(selectedSession.createdAt).toLocaleString('zh-CN')}
                            </Descriptions.Item>
                            <Descriptions.Item label="完成时间">
                                {selectedSession.completedAt
                                    ? new Date(selectedSession.completedAt).toLocaleString('zh-CN')
                                    : '-'
                                }
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Token统计 */}
                        <Card title="Token 使用统计" size="small">
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Statistic
                                        title="输入Token"
                                        value={selectedSession.inputTokens}
                                        valueStyle={{ fontSize: 18 }}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title="输出Token"
                                        value={selectedSession.outputTokens}
                                        valueStyle={{ fontSize: 18 }}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title="总Token数"
                                        value={selectedSession.totalTokens}
                                        valueStyle={{ fontSize: 18, color: '#1890ff' }}
                                    />
                                </Col>
                            </Row>
                        </Card>

                        {/* 执行步骤 */}
                        <Card title="执行步骤" size="small">
                            <Timeline>
                                {stepLogs.map((step, index) => (
                                    <Timeline.Item
                                        key={step.id}
                                        color={getStepStatusColor(step.status)}
                                        dot={step.status === 'running' ? <ClockCircleOutlined /> : undefined}
                                    >
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Space>
                                                <Text strong>{STEP_NAMES[step.stepName] || step.stepName}</Text>
                                                <Tag color={getStepStatusColor(step.status)}>
                                                    {step.status === 'success' ? '成功' :
                                                        step.status === 'failed' ? '失败' :
                                                            step.status === 'skipped' ? '跳过' : '运行中'}
                                                </Tag>
                                                {step.duration && (
                                                    <Tag icon={<ClockCircleOutlined />}>
                                                        {(step.duration / 1000).toFixed(2)}s
                                                    </Tag>
                                                )}
                                                {(step.inputTokens > 0 || step.outputTokens > 0) && (
                                                    <Tag icon={<ThunderboltOutlined />}>
                                                        {step.inputTokens + step.outputTokens} tokens
                                                    </Tag>
                                                )}
                                            </Space>
                                            {step.executionLog && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {step.executionLog}
                                                </Text>
                                            )}
                                            {step.errorMessage && (
                                                <Text type="danger" style={{ fontSize: 12 }}>
                                                    错误: {step.errorMessage}
                                                </Text>
                                            )}
                                            {step.modelName && (
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    模型: {step.modelName}
                                                </Text>
                                            )}
                                            {/* 如果是搜索步骤，展示搜索到的网页 */}
                                            {step.stepName === 'searchSearxng' && step.outputResult && (() => {
                                                try {
                                                    const searchResults = JSON.parse(step.outputResult);
                                                    if (Array.isArray(searchResults) && searchResults.length > 0) {
                                                        return (
                                                            <div style={{ marginTop: 8 }}>
                                                                <Text strong style={{ fontSize: 12 }}>搜索到的网页：</Text>
                                                                <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 12 }}>
                                                                    {searchResults.slice(0, 5).map((result: any, idx: number) => (
                                                                        <li key={idx} style={{ marginBottom: 4 }}>
                                                                            <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
                                                                                {result.title}
                                                                            </a>
                                                                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                                                                ({result.keyword})
                                                                            </Text>
                                                                        </li>
                                                                    ))}
                                                                    {searchResults.length > 5 && (
                                                                        <li style={{ color: '#999' }}>还有 {searchResults.length - 5} 条结果...</li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        );
                                                    }
                                                } catch (e) {
                                                    return null;
                                                }
                                                return null;
                                            })()}
                                        </Space>
                                    </Timeline.Item>
                                ))}
                            </Timeline>
                        </Card>

                        {/* 错误信息 */}
                        {selectedSession.errorMessage && (
                            <Card title="错误信息" size="small">
                                <Text type="danger">{selectedSession.errorMessage}</Text>
                            </Card>
                        )}
                    </Space>
                )}
            </Modal>

            {/* 报告弹窗 */}
            <Modal
                title="研究报告"
                open={reportModalVisible}
                onCancel={() => setReportModalVisible(false)}
                width={800}
                footer={[
                    <Button key="close" onClick={() => setReportModalVisible(false)}>
                        关闭
                    </Button>
                ]}
            >
                <div style={{ maxHeight: '600px', overflow: 'auto', padding: '16px' }}>
                    <ReactMarkdown>{selectedReport}</ReactMarkdown>
                </div>
            </Modal>
        </div>
    );
};

export default SearchRecordsPage;
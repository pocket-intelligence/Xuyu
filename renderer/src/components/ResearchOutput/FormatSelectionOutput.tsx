import React from 'react';
import { Card, Space, Typography, Button } from 'antd';

const { Text, Paragraph } = Typography;

interface FormatSelectionOutputProps {
    options: string[];
    onSelect: (format: string) => void;
    loading?: boolean;
}

const FormatSelectionOutput: React.FC<FormatSelectionOutputProps> = ({ options, onSelect, loading = false }) => {
    const formatConfig: Record<string, { icon: string; color: string; description: string }> = {
        '直接问答': {
            icon: '💬',
            color: '#52c41a',
            description: '简洁回答，快速获取核心信息'
        },
        '深度报告': {
            icon: '📄',
            color: '#1890ff',
            description: '详细分析，包含引言、分析、趋势等完整内容'
        },
        '结构化输出': {
            icon: '🗂️',
            color: '#722ed1',
            description: 'JSON格式，便于程序化处理'
        }
    };

    return (
        <Card
            style={{
                marginTop: 24,
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                boxShadow: 'none',
                backgroundColor: '#fafafa',
            }}
            bodyStyle={{ padding: '20px 24px' }}
        >
            <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 16, color: '#333' }}>
                    📊 请选择输出格式
                </Text>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    根据您的需求选择合适的报告格式
                </Paragraph>
            </div>

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {options.map((option: string) => {
                    const config = formatConfig[option];

                    return (
                        <Card
                            key={option}
                            hoverable
                            onClick={() => !loading && onSelect(option)}
                            style={{
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                border: `1px solid ${config?.color || '#d9d9d9'}`,
                                borderRadius: 8,
                                backgroundColor: '#fff',
                                transition: 'all 0.2s ease',
                            }}
                            bodyStyle={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '12px 16px',
                            }}
                        >
                            <div style={{ fontSize: 28 }}>{config?.icon || '📝'}</div>
                            <div style={{ flex: 1 }}>
                                <Text strong style={{ fontSize: 16, color: '#333' }}>
                                    {option}
                                </Text>
                                <Paragraph
                                    type="secondary"
                                    style={{ marginBottom: 0, fontSize: 13, color: '#666' }}
                                >
                                    {config?.description || ''}
                                </Paragraph>
                            </div>
                        </Card>
                    );
                })}
            </Space>
        </Card>
    );
};

export default FormatSelectionOutput;

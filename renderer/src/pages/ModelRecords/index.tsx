import React from 'react';
import { Card, Typography, Table, Space, Tag } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ModelRecordsPage: React.FC = () => {
    // 模拟数据
    const dataSource = [
        {
            key: '1',
            model: 'gpt-3.5-turbo',
            prompt: '分析人工智能对就业市场的影响...',
            tokens: 1200,
            date: '2023-05-15 14:30',
            cost: '0.012'
        },
        {
            key: '2',
            model: 'gpt-4',
            prompt: '生成研究报告大纲...',
            tokens: 800,
            date: '2023-05-14 10:15',
            cost: '0.025'
        }
    ];

    const columns = [
        {
            title: '模型',
            dataIndex: 'model',
            key: 'model',
        },
        {
            title: '提示词',
            dataIndex: 'prompt',
            key: 'prompt',
            render: (text: string) => (
                <Text ellipsis={{ tooltip: text }} style={{ width: 200 }}>
                    {text}
                </Text>
            )
        },
        {
            title: 'Token数',
            dataIndex: 'tokens',
            key: 'tokens',
        },
        {
            title: '费用($)',
            dataIndex: 'cost',
            key: 'cost',
        },
        {
            title: '时间',
            dataIndex: 'date',
            key: 'date',
        }
    ];

    return (
        <div className="p-4">
            <Space className="w-full justify-between">
                <div>
                    <Title level={2}>
                        <BarChartOutlined className="mr-2" />
                        大模型调用记录
                    </Title>
                    <Text type="secondary">查看大模型调用历史和消耗统计</Text>
                </div>
            </Space>

            <Card className="mt-6">
                <Table dataSource={dataSource} columns={columns} pagination={{ pageSize: 10 }} />
            </Card>
        </div>
    );
};

export default ModelRecordsPage;
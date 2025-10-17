import React from 'react';
import { Card, Typography, Table, Space, Tag } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SearchRecordsPage: React.FC = () => {
    // 模拟数据
    const dataSource = [
        {
            key: '1',
            query: '人工智能发展趋势',
            subQueries: 3,
            items: 15,
            date: '2023-05-15 14:30',
            status: 'completed'
        },
        {
            key: '2',
            query: '机器学习应用领域',
            subQueries: 2,
            items: 8,
            date: '2023-05-14 10:15',
            status: 'completed'
        }
    ];

    const columns = [
        {
            title: '查询主题',
            dataIndex: 'query',
            key: 'query',
        },
        {
            title: '子问题数',
            dataIndex: 'subQueries',
            key: 'subQueries',
        },
        {
            title: '搜索结果数',
            dataIndex: 'items',
            key: 'items',
        },
        {
            title: '时间',
            dataIndex: 'date',
            key: 'date',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'completed' ? 'green' : 'orange'}>
                    {status === 'completed' ? '已完成' : '进行中'}
                </Tag>
            )
        }
    ];

    return (
        <div className="p-4">
            <Space className="w-full justify-between">
                <div>
                    <Title level={2}>
                        <HistoryOutlined className="mr-2" />
                        检索记录
                    </Title>
                    <Text type="secondary">查看历史检索记录和详细信息</Text>
                </div>
            </Space>

            <Card className="mt-6">
                <Table dataSource={dataSource} columns={columns} pagination={{ pageSize: 10 }} />
            </Card>
        </div>
    );
};

export default SearchRecordsPage;
import React from 'react';
import { Card, Typography, Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const DeepResearchPage: React.FC = () => {
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
                    />
                    <Button type="primary" size="large" className="self-start">
                        开始研究
                    </Button>
                </Space>
            </Card>

        </div>
    );
};

export default DeepResearchPage;
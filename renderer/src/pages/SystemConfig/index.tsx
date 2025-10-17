import React from 'react';
import { Card, Typography, Form, Input, Button, Space, Divider, Switch } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SystemConfigPage: React.FC = () => {
    return (
        <div className="p-4">
            <Space className="w-full justify-between">
                <div>
                    <Title level={2}>
                        <SettingOutlined className="mr-2" />
                        系统配置
                    </Title>
                    <Text type="secondary">配置大模型和SearxNG相关参数</Text>
                </div>
            </Space>

            <Card className="mt-6">
                <Title level={4}>大模型配置</Title>
                <Form layout="vertical">
                    <Form.Item label="API地址" name="apiUrl">
                        <Input placeholder="请输入大模型API地址" />
                    </Form.Item>
                    <Form.Item label="模型名称" name="modelName">
                        <Input placeholder="请输入模型名称" />
                    </Form.Item>
                    <Form.Item label="API密钥" name="apiKey">
                        <Input.Password placeholder="请输入API密钥" />
                    </Form.Item>
                </Form>
            </Card>

            <Card className="mt-6">
                <Title level={4}>SearxNG配置</Title>
                <Form layout="vertical">
                    <Form.Item label="实例地址" name="searxngUrl">
                        <Input placeholder="请输入SearxNG实例地址" />
                    </Form.Item>
                    <Form.Item label="启用代理" name="proxyEnabled" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Card>

            <Card className="mt-6">
                <Space>
                    <Button type="primary">保存配置</Button>
                    <Button>恢复默认</Button>
                </Space>
            </Card>
        </div>
    );
};

export default SystemConfigPage;
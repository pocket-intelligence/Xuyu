import React, { useEffect, useState } from 'react';
import { Card, Typography, Form, Input, Button, Space, message, Divider } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SystemConfigPage: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // 页面加载时获取配置
    useEffect(() => {
        setLoading(true);
        window.electronAPI.getConfig((result) => {
            setLoading(false);
            if (result.success) {
                form.setFieldsValue(result.data);
            } else {
                message.error(result.message || '获取配置失败');
            }
        });
    }, [form]);

    // 保存配置
    const handleSave = () => {
        form.validateFields().then((values) => {
            setLoading(true);
            window.electronAPI.saveConfig({ config: values }, (result) => {
                setLoading(false);
                if (result.success) {
                    message.success('配置保存成功');
                } else {
                    message.error(result.message || '配置保存失败');
                }
            });
        });
    };

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
                <Title level={4}>语言模型配置</Title>
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="API地址"
                        name="llmApiUrl"
                        rules={[{ required: true, message: '请输入API地址' }]}
                    >
                        <Input placeholder="请输入语言模型API地址" />
                    </Form.Item>
                    <Form.Item
                        label="模型名称"
                        name="llmModelName"
                        rules={[{ required: true, message: '请输入模型名称' }]}
                    >
                        <Input placeholder="请输入语言模型名称" />
                    </Form.Item>
                    <Form.Item
                        label="API密钥"
                        name="llmApiKey"
                        rules={[{ required: true, message: '请输入API密钥' }]}
                    >
                        <Input.Password placeholder="请输入语言模型API密钥" />
                    </Form.Item>
                </Form>
            </Card>

            <Card className="mt-6">
                <Title level={4}>多模态模型配置（用于图像理解和OCR）</Title>
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="API地址"
                        name="multimodalApiUrl"
                        rules={[{ required: true, message: '请输入API地址' }]}
                    >
                        <Input placeholder="请输入多模态模型API地址" />
                    </Form.Item>
                    <Form.Item
                        label="模型名称"
                        name="multimodalModelName"
                        rules={[{ required: true, message: '请输入模型名称' }]}
                    >
                        <Input placeholder="请输入多模态模型名称" />
                    </Form.Item>
                    <Form.Item
                        label="API密钥"
                        name="multimodalApiKey"
                        rules={[{ required: true, message: '请输入API密钥' }]}
                    >
                        <Input.Password placeholder="请输入多模态模型API密钥" />
                    </Form.Item>
                </Form>
            </Card>

            <Card className="mt-6">
                <Title level={4}>SearxNG配置</Title>
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="实例地址"
                        name="searxngUrl"
                        rules={[{ required: true, message: '请输入SearxNG实例地址' }]}
                    >
                        <Input placeholder="请输入SearxNG实例地址" />
                    </Form.Item>
                </Form>
            </Card>

            <Card className="mt-6">
                <Space>
                    <Button type="primary" onClick={handleSave} loading={loading}>
                        保存配置
                    </Button>
                </Space>
            </Card>
        </div>
    );
};

export default SystemConfigPage;
import React, { useState } from 'react';
import { Typography, Input, Button, Card, Space, Alert } from 'antd';
import { SendOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface UserInputOutputProps {
    content: string;
    onUserInputSubmit?: (input: string) => void;
}

const UserInputOutput: React.FC<UserInputOutputProps> = ({ content, onUserInputSubmit }) => {
    const [userInput, setUserInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!userInput.trim()) {
            return;
        }

        if (onUserInputSubmit) {
            setIsSubmitting(true);
            onUserInputSubmit(userInput);
            // 不需要清空输入，因为组件会重新渲染
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div>
            {/* 如果有 content，显示问题 */}
            {content && (
                <Paragraph strong className="mb-3">
                    {content}
                </Paragraph>
            )}

            <TextArea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="请输入您的回答，按 Ctrl+Enter 快速提交"
                autoSize={{ minRows: 4, maxRows: 10 }}
                disabled={isSubmitting}
                autoFocus
                style={{ fontSize: '14px' }}
            />
            <div className="mt-3 flex justify-between items-center">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    提示：按 Ctrl+Enter 快速提交
                </Text>
                <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    onClick={handleSubmit}
                    disabled={!userInput.trim() || isSubmitting}
                    loading={isSubmitting}
                >
                    {isSubmitting ? '提交中...' : '提交回答'}
                </Button>
            </div>
        </div>
    );
};

export default UserInputOutput;
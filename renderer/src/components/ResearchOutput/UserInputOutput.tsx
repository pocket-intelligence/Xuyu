import React, { useState } from 'react';
import { Typography, Input, Button } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;

interface UserInputOutputProps {
    content: string;
    onUserInputSubmit?: (input: string) => void;
}

const UserInputOutput: React.FC<UserInputOutputProps> = ({ content, onUserInputSubmit }) => {
    const [userInput, setUserInput] = useState('');

    const handleSubmit = () => {
        if (userInput.trim() && onUserInputSubmit) {
            onUserInputSubmit(userInput);
            setUserInput('');
        }
    };

    return (
        <div className="mt-4">
            <Text>{content}</Text>
            <div className="mt-4">
                <TextArea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="请输入您的回答"
                    autoSize={{ minRows: 3, maxRows: 6 }}
                />
                <Button
                    type="primary"
                    className="mt-2"
                    onClick={handleSubmit}
                >
                    提交
                </Button>
            </div>
        </div>
    );
};

export default UserInputOutput;
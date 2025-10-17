import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface TextOutputProps {
    content: string;
}

const TextOutput: React.FC<TextOutputProps> = ({ content }) => {
    return <Text>{content}</Text>;
};

export default TextOutput;
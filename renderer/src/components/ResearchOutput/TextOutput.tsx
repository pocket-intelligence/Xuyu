import React from 'react';
import { Typography, Card } from 'antd';

const { Paragraph } = Typography;

interface TextOutputProps {
    content: string;
}

const TextOutput: React.FC<TextOutputProps> = ({ content }) => {
    return (
        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
            <Paragraph
                style={{
                    marginBottom: 0,
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px',
                    lineHeight: '1.8'
                }}
            >
                {content}
            </Paragraph>
        </Card>
    );
};

export default TextOutput;
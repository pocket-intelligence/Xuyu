import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownOutputProps {
    content: string;
}

const MarkdownOutput: React.FC<MarkdownOutputProps> = ({ content }) => {
    return <ReactMarkdown>{content}</ReactMarkdown>;
};

export default MarkdownOutput;
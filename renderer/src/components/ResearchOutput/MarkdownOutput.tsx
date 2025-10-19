import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownOutputProps {
    content: string;
}

const MarkdownOutput: React.FC<MarkdownOutputProps> = ({ content }) => {
    // Markdown 自定义样式
    const markdownComponents = {
        h1: ({ node, ...props }: any) => <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '16px', marginBottom: '12px', borderBottom: '2px solid #e8e8e8', paddingBottom: '8px' }} {...props} />,
        h2: ({ node, ...props }: any) => <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '14px', marginBottom: '10px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }} {...props} />,
        h3: ({ node, ...props }: any) => <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '12px', marginBottom: '8px' }} {...props} />,
        p: ({ node, ...props }: any) => <p style={{ marginBottom: '12px', lineHeight: '1.8' }} {...props} />,
        ul: ({ node, ...props }: any) => <ul style={{ marginLeft: '24px', marginBottom: '12px', lineHeight: '1.8' }} {...props} />,
        ol: ({ node, ...props }: any) => <ol style={{ marginLeft: '24px', marginBottom: '12px', lineHeight: '1.8' }} {...props} />,
        li: ({ node, ...props }: any) => <li style={{ marginBottom: '6px' }} {...props} />,
        strong: ({ node, ...props }: any) => <strong style={{ fontWeight: 600, color: '#262626' }} {...props} />,
        code: ({ node, inline, ...props }: any) =>
            inline
                ? <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', fontSize: '14px', color: '#d63384' }} {...props} />
                : <code style={{ display: 'block', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '6px', fontSize: '14px', overflow: 'auto', marginBottom: '12px' }} {...props} />,
        // 表格样式
        table: ({ node, ...props }: any) => (
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '16px',
                border: '1px solid #e8e8e8'
            }} {...props} />
        ),
        thead: ({ node, ...props }: any) => (
            <thead style={{ backgroundColor: '#fafafa' }} {...props} />
        ),
        tbody: ({ node, ...props }: any) => <tbody {...props} />,
        tr: ({ node, ...props }: any) => (
            <tr style={{ borderBottom: '1px solid #e8e8e8' }} {...props} />
        ),
        th: ({ node, ...props }: any) => (
            <th style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: 600,
                borderRight: '1px solid #e8e8e8'
            }} {...props} />
        ),
        td: ({ node, ...props }: any) => (
            <td style={{
                padding: '12px',
                borderRight: '1px solid #e8e8e8'
            }} {...props} />
        ),
    };

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
        >
            {content}
        </ReactMarkdown>
    );
};

export default MarkdownOutput;
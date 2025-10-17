import React from 'react';
import TextOutput from './TextOutput';
import MarkdownOutput from './MarkdownOutput';
import SelectionOutput from './SelectionOutput';
import UserInputOutput from './UserInputOutput';

// 定义输出接口
interface ResearchOutput {
    type: string;
    content: unknown;
    metadata?: Record<string, unknown>;
}

interface ResearchOutputRendererProps {
    output: ResearchOutput | null;
    onUserInputSubmit?: (input: string) => void;
}

const ResearchOutputRenderer: React.FC<ResearchOutputRendererProps> = ({ output, onUserInputSubmit }) => {
    if (!output) return null;

    // 如果输出是一个对象但没有type字段，直接显示其内容
    if (typeof output === 'object' && !output.type) {
        // 检查是否是details对象（包含details和message字段）
        if (output && typeof output === 'object' && 'details' in output) {
            return <TextOutput content={String((output as { details: string }).details)} />;
        }
        // 其他情况，转换为JSON字符串显示
        return <TextOutput content={JSON.stringify(output)} />;
    }

    // 根据类型渲染对应的组件
    switch (output.type) {
        case 'text':
            return <TextOutput content={String(output.content)} />;

        case 'markdown':
            return <MarkdownOutput content={String(output.content)} />;

        case 'selection':
            if (Array.isArray(output.content)) {
                return <SelectionOutput content={output.content} />;
            }
            return <TextOutput content={JSON.stringify(output.content)} />;

        case 'wait-for-user-input':
            return <UserInputOutput
                content={String(output.content)}
                onUserInputSubmit={onUserInputSubmit}
            />;

        default:
            // 对于未知类型，尝试直接显示内容，如果内容是对象则转换为JSON字符串
            if (typeof output.content === 'object') {
                return <TextOutput content={JSON.stringify(output.content)} />;
            }
            return <TextOutput content={String(output.content) || JSON.stringify(output)} />;
    }
};

export default ResearchOutputRenderer;
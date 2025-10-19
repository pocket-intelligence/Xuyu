import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, Divider } from 'antd';
import EChartsRenderer from './EChartsRenderer';

interface MarkdownWithChartsOutputProps {
    content: string;
}

/**
 * 带图表支持的 Markdown 渲染组件
 * 1. 解析 Markdown 中的 HTML 注释提取 ECharts 配置
 * 2. 替换 {{CHART:chartId}} 占位符为实际图表
 */
const MarkdownWithChartsOutput: React.FC<MarkdownWithChartsOutputProps> = ({ content }) => {
    // 解析图表配置
    const { charts, cleanedContent } = useMemo(() => {
        let charts: any[] = [];
        let cleaned = content;

        // 提取 ECharts 配置（从 HTML 注释中）
        const match = content.match(/<!--\s*ECHARTS_CONFIG_START\s*([\s\S]*?)\s*ECHARTS_CONFIG_END\s*-->/);
        if (match) {
            try {
                charts = JSON.parse(match[1]);
                // 移除配置注释
                cleaned = content.replace(match[0], '');
            } catch (e) {
                console.error('[MarkdownWithCharts] 解析图表配置失败:', e);
            }
        }

        return { charts, cleanedContent: cleaned };
    }, [content]);

    // 创建图表映射
    const chartMap = useMemo(() => {
        const map: Record<string, any> = {};
        charts.forEach(chart => {
            if (chart.chartId) {
                map[chart.chartId] = chart;
            }
        });
        return map;
    }, [charts]);

    // 将 Markdown 分段处理（按图表占位符分割）
    const sections = useMemo(() => {
        const parts: Array<{ type: 'markdown' | 'chart'; content: string | { chartId: string; config: any; title?: string; description?: string } }> = [];
        let remaining = cleanedContent;

        const placeholderRegex = /{{CHART:(\w+)}}/g;
        let lastIndex = 0;
        let match;

        while ((match = placeholderRegex.exec(remaining)) !== null) {
            // 添加占位符之前的 Markdown 内容
            if (match.index > lastIndex) {
                parts.push({
                    type: 'markdown',
                    content: remaining.substring(lastIndex, match.index)
                });
            }

            // 添加图表
            const chartId = match[1];
            if (chartMap[chartId]) {
                parts.push({
                    type: 'chart',
                    content: chartMap[chartId]
                });
            }

            lastIndex = match.index + match[0].length;
        }

        // 添加剩余的 Markdown 内容
        if (lastIndex < remaining.length) {
            parts.push({
                type: 'markdown',
                content: remaining.substring(lastIndex)
            });
        }

        return parts;
    }, [cleanedContent, chartMap]);

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
        <div className="markdown-with-charts-output">
            {sections.map((section, index) => {
                if (section.type === 'markdown') {
                    return (
                        <ReactMarkdown
                            key={index}
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                        >
                            {section.content as string}
                        </ReactMarkdown>
                    );
                } else {
                    const chartData = section.content as { chartId: string; config: any; title?: string; description?: string };
                    return (
                        <Card
                            key={index}
                            style={{ marginBottom: '20px' }}
                            title={chartData.title || '数据可视化'}
                        >
                            {chartData.description && (
                                <>
                                    <p style={{ color: '#666', marginBottom: '12px' }}>{chartData.description}</p>
                                    <Divider style={{ margin: '12px 0' }} />
                                </>
                            )}
                            <EChartsRenderer
                                chartId={chartData.chartId}
                                config={chartData.config}
                                height={400}
                            />
                        </Card>
                    );
                }
            })}
        </div>
    );
};

export default MarkdownWithChartsOutput;

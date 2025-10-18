import React, { useState, useEffect } from 'react';
import { Card, Progress, Badge, Typography, Space } from 'antd';
import { MinusOutlined, ExpandOutlined, CloseOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface ScrapeProgressData {
    type: 'start' | 'progress' | 'complete' | 'error' | 'search_start' | 'search_complete' | 'search_error';
    current: number;
    total: number;
    url?: string;
    title?: string;
    wordCount?: number;
    error?: string;
    // 搜索相关字段
    keyword?: string;
    resultCount?: number;
    results?: Array<{ title: string; url: string }>;
}

interface ProgressItem {
    type: 'search' | 'scrape';
    keyword?: string;
    url?: string;
    title: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    wordCount?: number;
    resultCount?: number;
    error?: string;
    results?: Array<{ title: string; url: string }>;
}

const ScrapeProgressOverlay: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [items, setItems] = useState<ProgressItem[]>([]);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPhase, setCurrentPhase] = useState<'search' | 'scrape'>('search');

    useEffect(() => {
        // 监听抓取进度
        const handleProgress = (progress: ScrapeProgressData) => {
            console.log('[ScrapeProgressOverlay] 收到进度:', progress);

            // 显示组件
            setVisible(true);
            setTotalCount(progress.total);
            setCurrentProgress(progress.current);

            // 处理搜索进度
            if (progress.type === 'search_start') {
                setCurrentPhase('search');
                // 检查是否已存在该关键词，避免重复
                setItems(prev => {
                    const exists = prev.some(item => item.type === 'search' && item.keyword === progress.keyword);
                    if (exists) return prev;
                    return [
                        ...prev,
                        {
                            type: 'search',
                            keyword: progress.keyword,
                            title: `搜索关键词: ${progress.keyword}`,
                            status: 'processing'
                        }
                    ];
                });
            } else if (progress.type === 'search_complete') {
                setItems(prev =>
                    prev.map(item =>
                        item.type === 'search' && item.keyword === progress.keyword
                            ? {
                                ...item,
                                status: 'success',
                                resultCount: progress.resultCount,
                                results: progress.results
                            }
                            : item
                    )
                );
            } else if (progress.type === 'search_error') {
                setItems(prev =>
                    prev.map(item =>
                        item.type === 'search' && item.keyword === progress.keyword
                            ? { ...item, status: 'error', error: progress.error }
                            : item
                    )
                );
            }
            // 处理页面抓取进度
            else if (progress.type === 'start') {
                setCurrentPhase('scrape');
                // 检查是否已存在该URL，避免重复
                setItems(prev => {
                    const exists = prev.some(item => item.type === 'scrape' && item.url === progress.url);
                    if (exists) {
                        // 如果已存在，更新状态为processing
                        return prev.map(item =>
                            item.type === 'scrape' && item.url === progress.url
                                ? { ...item, status: 'processing', title: progress.title || item.title }
                                : item
                        );
                    }
                    return [
                        ...prev,
                        {
                            type: 'scrape',
                            url: progress.url || '',
                            title: progress.title || '加载中...',
                            status: 'processing'
                        }
                    ];
                });
            } else if (progress.type === 'complete') {
                setItems(prev =>
                    prev.map(item =>
                        item.type === 'scrape' && item.url === progress.url
                            ? { ...item, status: 'success', title: progress.title || item.title, wordCount: progress.wordCount }
                            : item
                    )
                );

                // 如果所有都完成了，3秒后自动隐藏
                if (progress.current === progress.total && currentPhase === 'scrape') {
                    setTimeout(() => {
                        setVisible(false);
                        setItems([]);
                        setCurrentProgress(0);
                        setTotalCount(0);
                    }, 3000);
                }
            } else if (progress.type === 'error') {
                setItems(prev =>
                    prev.map(item =>
                        item.type === 'scrape' && item.url === progress.url
                            ? { ...item, status: 'error', error: progress.error }
                            : item
                    )
                );
            }
        };

        window.electronAPI.onScrapeProgress(handleProgress);

        return () => {
            // 清理监听器
            window.electronAPI.removeScrapeProgressListener(handleProgress);
        };
    }, []);

    if (!visible) return null;

    const percent = totalCount > 0 ? Math.round((currentProgress / totalCount) * 100) : 0;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                width: minimized ? 200 : 400,
                maxHeight: minimized ? 60 : 500,
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: 8,
                overflow: 'hidden',
            }}
        >
            <Card
                size="small"
                title={
                    <Space>
                        <Badge status="processing" />
                        <Text strong>
                            {currentPhase === 'search' ? 'SearxNG 搜索进度' : '页面抓取进度'}
                        </Text>
                        <Text type="secondary">({currentProgress}/{totalCount})</Text>
                    </Space>
                }
                extra={
                    <Space size={4}>
                        <MinusOutlined
                            onClick={() => setMinimized(!minimized)}
                            style={{ cursor: 'pointer' }}
                        />
                        <CloseOutlined
                            onClick={() => {
                                setVisible(false);
                                setItems([]);
                                setCurrentProgress(0);
                                setTotalCount(0);
                            }}
                            style={{ cursor: 'pointer' }}
                        />
                    </Space>
                }
                style={{ height: '100%' }}
                bodyStyle={{
                    maxHeight: minimized ? 0 : 400,
                    overflow: 'auto',
                    padding: minimized ? 0 : 12,
                    transition: 'all 0.3s',
                }}
            >
                {!minimized && (
                    <>
                        <Progress percent={percent} status="active" style={{ marginBottom: 16 }} />

                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            {items.map((item, index) => (
                                <Card
                                    key={index}
                                    size="small"
                                    style={{
                                        borderLeft: `3px solid ${item.status === 'success'
                                            ? '#52c41a'
                                            : item.status === 'error'
                                                ? '#ff4d4f'
                                                : '#1890ff'
                                            }`,
                                    }}
                                >
                                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                        <Text strong ellipsis style={{ fontSize: 12 }}>
                                            {item.type === 'search' ? '🔍' : '🌐'} {item.title}
                                        </Text>

                                        {item.type === 'search' && item.status === 'success' && item.results && (
                                            <div style={{ paddingLeft: 8, marginTop: 4 }}>
                                                {item.results.map((result, idx) => (
                                                    <Paragraph
                                                        key={idx}
                                                        ellipsis={{ rows: 1 }}
                                                        style={{ margin: '2px 0', fontSize: 10, color: '#666' }}
                                                    >
                                                        {idx + 1}. {result.title}
                                                    </Paragraph>
                                                ))}
                                            </div>
                                        )}

                                        {item.type === 'scrape' && item.url && (
                                            <Paragraph
                                                ellipsis={{ rows: 1 }}
                                                style={{ margin: 0, fontSize: 11, color: '#999' }}
                                            >
                                                {item.url}
                                            </Paragraph>
                                        )}

                                        {item.status === 'success' && item.type === 'search' && item.resultCount !== undefined && (
                                            <Text type="success" style={{ fontSize: 11 }}>
                                                ✓ 找到 {item.resultCount} 条结果
                                            </Text>
                                        )}
                                        {item.status === 'success' && item.type === 'scrape' && item.wordCount && (
                                            <Text type="success" style={{ fontSize: 11 }}>
                                                ✓ 提取 {item.wordCount} 字
                                            </Text>
                                        )}
                                        {item.status === 'error' && (
                                            <Text type="danger" style={{ fontSize: 11 }}>
                                                ✗ {item.error || '失败'}
                                            </Text>
                                        )}
                                        {item.status === 'processing' && (
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                ⏳ 正在处理...
                                            </Text>
                                        )}
                                    </Space>
                                </Card>
                            ))}
                        </Space>
                    </>
                )}
            </Card>
        </div>
    );
};

export default ScrapeProgressOverlay;

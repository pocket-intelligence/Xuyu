import React, { useState, useEffect, useRef } from 'react';
import { Modal, Progress, Typography, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DesktopOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface BrowserDownloadModalProps {
    visible: boolean;
    onClose: () => void;
}

const BrowserDownloadModal: React.FC<BrowserDownloadModalProps> = ({ visible, onClose }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('正在检查浏览器环境...');
    const [isFailed, setIsFailed] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const lastProgressRef = useRef(0);
    const progressUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (visible) {
            // 重置状态
            setProgress(0);
            setStatus('正在检查浏览器环境...');
            setIsFailed(false);
            setErrorMessage('');
            lastProgressRef.current = 0;

            // 清除之前的定时器
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
            }

            // 监听下载进度
            window.electronAPI.onProgress((percent: number) => {
                // 限制进度更新频率，避免过多更新
                if (percent - lastProgressRef.current >= 1 || percent === 100) {
                    setProgress(percent);
                    setStatus(`正在下载浏览器...`);
                    lastProgressRef.current = percent;
                }
            });

            // 监听下载失败
            window.electronAPI.onDownloadFailed((msg: string) => {
                setIsFailed(true);
                setErrorMessage(msg);
                setStatus('下载失败');

                // 清除进度更新定时器
                if (progressUpdateTimerRef.current) {
                    clearInterval(progressUpdateTimerRef.current);
                }
            });

            // 监听隐藏模态框事件
            window.electronAPI.on('hide-download-modal', () => {
                // 显示完成状态
                setProgress(100);
                setStatus('浏览器下载完成！');

                // 延迟关闭模态框，让用户看到完成状态
                setTimeout(() => {
                    onClose();
                }, 1500);
            });
        }

        return () => {
            // 组件卸载时清除定时器
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
            }
        };
    }, [visible, onClose]);

    const handleRetry = () => {
        // 重新开始下载逻辑需要在主进程中处理
        window.electronAPI.sendMessage('retry-download');
        setIsFailed(false);
        setProgress(0);
        setStatus('重新开始下载...');
        lastProgressRef.current = 0;
    };

    return (
        <Modal
            open={visible}
            closable={false}
            maskClosable={false}
            footer={null}
            width={400}
            centered
            // 禁止用户通过ESC键关闭模态框
            keyboard={false}
        >
            <div className="text-center py-6">
                {isFailed ? (
                    <>
                        <div className="mb-4 flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                <CloseCircleOutlined className="text-red-500 text-2xl" />
                            </div>
                        </div>
                        <Title level={4} className="mb-2">下载失败</Title>
                        <Text type="secondary" className="block mb-4">{errorMessage}</Text>
                        <Button type="primary" onClick={handleRetry} className="mt-2">
                            重试下载
                        </Button>
                    </>
                ) : progress === 100 ? (
                    <>
                        <div className="mb-4 flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircleOutlined className="text-green-500 text-2xl" />
                            </div>
                        </div>
                        <Title level={4} className="mb-2">下载完成</Title>
                        <Text type="secondary" className="block mb-4">浏览器已准备就绪</Text>
                    </>
                ) : (
                    <>
                        <div className="mb-4 flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                                <DesktopOutlined className="text-blue-500 text-2xl" />
                            </div>
                        </div>
                        <Title level={4} className="mb-2">浏览器环境准备中</Title>
                        <Text type="secondary" className="block mb-4">{status}</Text>
                        <div className="px-4">
                            <Progress
                                percent={progress}
                                status="normal"
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                                className="mb-2"
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default BrowserDownloadModal;
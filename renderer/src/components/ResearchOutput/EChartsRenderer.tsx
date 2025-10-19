import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartsRendererProps {
    chartId: string;
    config: any;
    height?: number;
}

/**
 * ECharts 图表渲染组件
 * 用于在研究报告中渲染 LLM 生成的图表
 */
const EChartsRenderer: React.FC<EChartsRendererProps> = ({ chartId, config, height = 400 }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current || !config) return;

        // 初始化 ECharts 实例
        chartInstance.current = echarts.init(chartRef.current);

        // 设置配置
        chartInstance.current.setOption(config);

        // 监听窗口大小变化
        const handleResize = () => {
            chartInstance.current?.resize();
        };
        window.addEventListener('resize', handleResize);

        // 清理
        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
        };
    }, [config]);

    return (
        <div
            ref={chartRef}
            style={{ width: '100%', height: `${height}px` }}
            className="echarts-container"
        />
    );
};

export default EChartsRenderer;

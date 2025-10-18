import { Layout, Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SearchOutlined, HistoryOutlined, SettingOutlined, BarChartOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import BrowserDownloadModal from '../components/BrowserDownloadModal';
import defaultIcon from "../assets/icon.png"

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    // 根据当前路径确定选中的菜单项
    const getSelectedKey = () => {
        const path = location.pathname;
        if (path === '/' || path.includes('/deep-research')) return 'deep-research';
        if (path.includes('/search-records')) return 'search-records';
        if (path.includes('/system-config')) return 'system-config';

        return 'deep-research'; // 默认选中项
    };

    useEffect(() => {
        // 监听显示下载模态框事件
        window.electronAPI.on('show-download-modal', () => {
            setShowDownloadModal(true);
        });
    }, []);

    return (
        <Layout className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <Header
                className="flex items-center px-4 md:px-6 bg-white/80 backdrop-blur-md border-b border-gray-200/50 h-16 fixed top-0 left-0 right-0 z-50 shadow-soft"
            >
                <div className="flex items-center">
                    <img
                        src={defaultIcon}
                        alt="Logo"
                        className="h-8 w-8 mr-3 animate-bounce-gentle"
                    />
                    <div className="hidden sm:block">
                        <span className="font-bold text-xl bg-gradient-to-r from-primary-600 to-primary-900 bg-clip-text text-transparent">
                            须臾
                        </span>
                    </div>
                </div>
                <div className="flex-1"></div>
                <div className="flex items-center space-x-4">
                    <div className="hidden md:flex items-center space-x-2 bg-primary-50 px-3 py-1 rounded-full">
                        {/* <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> */}
                        <span className="text-primary-700 text-sm font-medium">吾尝终日而思，不如须臾之所学</span>
                    </div>
                </div>
            </Header>
            <Layout>
                <Sider
                    className="bg-white/90 backdrop-blur-md border-r border-gray-200/50 overflow-y-auto fixed left-0 h-screen z-40 shadow-soft"
                    style={{
                        top: '64px',
                        height: 'calc(100vh - 64px)',
                        width: '240px',
                    }}
                    width={240}
                >
                    <Menu
                        mode="inline"
                        selectedKeys={[getSelectedKey()]}
                        className="bg-transparent border-none pt-4"
                        items={[
                            {
                                key: 'deep-research',
                                label: <span className="font-medium">深度研究</span>,
                                onClick: () => navigate('/'),
                                icon: <SearchOutlined className="text-primary-600" />,
                                className: 'mx-2 mb-1 rounded-lg hover:bg-primary-50 transition-all duration-200'
                            },
                            {
                                key: 'search-records',
                                label: <span className="font-medium">智能体调用记录</span>,
                                onClick: () => navigate('/search-records'),
                                icon: <HistoryOutlined className="text-primary-600" />,
                                className: 'mx-2 mb-1 rounded-lg hover:bg-primary-50 transition-all duration-200'
                            },
                            {
                                key: 'system-config',
                                label: <span className="font-medium">系统配置</span>,
                                onClick: () => navigate('/system-config'),
                                icon: <SettingOutlined className="text-primary-600" />,
                                className: 'mx-2 mb-1 rounded-lg hover:bg-primary-50 transition-all duration-200'
                            },
                        ]}
                    />
                </Sider>

                <Content
                    className="bg-transparent transition-all duration-300"
                    style={{
                        padding: '24px',
                        marginLeft: '240px',
                        marginTop: '64px',
                        height: 'calc(100vh - 64px)',
                        overflow: 'hidden',
                    }}
                >
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-soft border border-white/50 p-6 h-full overflow-auto transition-all duration-300 hover:shadow-medium">
                        <Outlet />
                    </div>
                </Content>
            </Layout>

            {/* 浏览器下载模态框 */}
            <BrowserDownloadModal
                visible={showDownloadModal}
                onClose={() => setShowDownloadModal(false)}
            />
        </Layout>
    );
}
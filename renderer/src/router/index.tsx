import { createHashRouter } from 'react-router-dom';
import Error from "./Error";
import AppLayout from "../layout";

// 页面组件
import DeepResearchPage from "../pages/DeepResearch/index";
import SearchRecordsPage from "../pages/SearchRecords/index";
import SystemConfigPage from "../pages/SystemConfig/index";

export const router = createHashRouter([
    {
        element: <AppLayout />,
        children: [
            { index: true, element: <DeepResearchPage /> },  // 默认路由，匹配 "/"
            { path: '/', element: <DeepResearchPage /> },
            { path: '/search-records', element: <SearchRecordsPage /> },
            { path: '/system-config', element: <SystemConfigPage /> },
        ],
    },
    { path: '*', element: <Error /> },
]);
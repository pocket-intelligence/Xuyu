import { createBrowserRouter } from "react-router-dom";
import Error from "./Error";
import AppLayout from "../layout";

export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        children: [
            { index: true, element: <div /> },  // 默认路由，匹配 "/"
            { path: '/dashboard', element: <div /> },
        ],
    },
    { path: '*', element: <Error /> },
]);
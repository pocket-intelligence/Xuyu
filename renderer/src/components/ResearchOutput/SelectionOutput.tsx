import React from 'react';
import { List, Typography, Button } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 定义选择项接口
interface SelectionItem {
    title: string;
    url: string;
    [key: string]: unknown;
}

interface SelectionOutputProps {
    content: SelectionItem[];
}

const SelectionOutput: React.FC<SelectionOutputProps> = ({ content }) => {
    return (
        <List
            className="mt-4"
            bordered
            dataSource={content}
            renderItem={(item: SelectionItem) => (
                <List.Item>
                    <div className="w-full">
                        <div className="flex justify-between items-start">
                            <Text strong>{item.title}</Text>
                            <Button
                                type="link"
                                icon={<LinkOutlined />}
                                href={item.url}
                                target="_blank"
                            >
                                访问
                            </Button>
                        </div>
                    </div>
                </List.Item>
            )}
        />
    );
};

export default SelectionOutput;
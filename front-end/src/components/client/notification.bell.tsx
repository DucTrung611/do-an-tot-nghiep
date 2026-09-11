import { useEffect, useState } from "react";
import { Badge, Dropdown, Empty, List, Typography } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { callMarkAllNotificationsRead, callMarkNotificationRead } from "@/config/api";
import { fetchNotification, fetchUnreadCount, markAllRead, markRead } from "@/redux/slice/notificationSlide";
import { INotification } from "@/types/backend";
dayjs.extend(relativeTime);

const NotificationBell = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const { result, unread, isFetching } = useAppSelector(state => state.notification);
    const [open, setOpen] = useState(false);

    // đếm số chưa đọc ngay khi đăng nhập, không chờ mở dropdown mới biết badge
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchUnreadCount());
        }
    }, [isAuthenticated, dispatch]);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            dispatch(fetchNotification({ query: "current=1&pageSize=8&sort=-createdAt" }));
        }
    };

    const handleItemClick = async (item: INotification) => {
        setOpen(false);
        if (!item.isRead) {
            dispatch(markRead(item._id));
            callMarkNotificationRead(item._id);
        }
        if (item.link) navigate(item.link);
    };

    const handleMarkAllRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(markAllRead());
        await callMarkAllNotificationsRead();
    };

    if (!isAuthenticated) return null;

    const dropdownRender = () => (
        <div style={{ width: 340, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0" }}>
                <Typography.Text strong>Thông báo</Typography.Text>
                {unread > 0 && (
                    <Typography.Link onClick={handleMarkAllRead}>Đánh dấu tất cả đã đọc</Typography.Link>
                )}
            </div>
            <List
                loading={isFetching}
                dataSource={result}
                locale={{ emptyText: <Empty description="Không có thông báo" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                renderItem={(item) => (
                    <List.Item
                        onClick={() => handleItemClick(item)}
                        style={{
                            cursor: "pointer",
                            padding: "10px 16px",
                            background: item.isRead ? undefined : "#e6f4ff",
                        }}
                    >
                        <List.Item.Meta
                            title={item.title}
                            description={
                                <>
                                    <div>{item.message}</div>
                                    <div style={{ fontSize: 12, color: "#999" }}>{dayjs(item.createdAt).fromNow()}</div>
                                </>
                            }
                        />
                    </List.Item>
                )}
            />
            <div style={{ padding: "10px 16px", textAlign: "center", borderTop: "1px solid #f0f0f0" }}>
                <Typography.Link onClick={() => { setOpen(false); navigate("/notifications"); }}>
                    Xem tất cả
                </Typography.Link>
            </div>
        </div>
    );

    return (
        <Dropdown
            open={open}
            onOpenChange={handleOpenChange}
            trigger={["click"]}
            dropdownRender={dropdownRender}
        >
            <Badge count={unread} size="small" offset={[-2, 2]}>
                <BellOutlined style={{ fontSize: 20, cursor: "pointer" }} />
            </Badge>
        </Dropdown>
    );
};

export default NotificationBell;

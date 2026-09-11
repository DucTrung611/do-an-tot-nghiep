import { useEffect, useState } from "react";
import { Divider, Empty, List, Pagination, Spin, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { callMarkNotificationRead } from "@/config/api";
import { fetchNotification, markRead } from "@/redux/slice/notificationSlide";
import { INotification } from "@/types/backend";
import styles from "styles/client.module.scss";
dayjs.extend(relativeTime);

const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
    RESUME_STATUS: "Hồ sơ ứng tuyển",
    NEW_JOB_MATCH: "Việc làm mới",
};

const NotificationPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { result, meta, isFetching } = useAppSelector(state => state.notification);
    const [current, setCurrent] = useState(1);

    useEffect(() => {
        dispatch(fetchNotification({ query: `current=${current}&pageSize=10&sort=-createdAt` }));
    }, [current, dispatch]);

    const handleClick = (item: INotification) => {
        if (!item.isRead) {
            dispatch(markRead(item._id));
            callMarkNotificationRead(item._id);
        }
        if (item.link) navigate(item.link);
    };

    return (
        <div className={styles["container"]} style={{ marginTop: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>Thông Báo</div>
            <Divider />
            <Spin spinning={isFetching}>
                <List
                    dataSource={result}
                    locale={{ emptyText: <Empty description="Bạn chưa có thông báo nào" /> }}
                    renderItem={(item) => (
                        <List.Item
                            onClick={() => handleClick(item)}
                            style={{
                                cursor: "pointer",
                                padding: "12px 16px",
                                background: item.isRead ? undefined : "#e6f4ff",
                            }}
                        >
                            <List.Item.Meta
                                title={
                                    <>
                                        {item.title}{" "}
                                        <Tag color="blue">{NOTIFICATION_TYPE_LABEL[item.type] ?? item.type}</Tag>
                                    </>
                                }
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
                <div style={{ marginTop: 20, textAlign: "center" }}>
                    <Pagination
                        current={meta.current}
                        total={meta.total}
                        pageSize={meta.pageSize}
                        onChange={setCurrent}
                    />
                </div>
            </Spin>
        </div>
    );
};

export default NotificationPage;

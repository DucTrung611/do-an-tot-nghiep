import { useEffect, useRef } from "react";
import { notification as antdNotification } from "antd";
import { createNotificationSocket } from "@/config/socket";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { pushNotification } from "@/redux/slice/notificationSlide";
import { INotification } from "@/types/backend";

// Mount 1 lần ở layout gốc phía client. Kết nối/ngắt kết nối theo trạng thái
// đăng nhập — không mount lúc nào cũng connect vì user có thể chưa đăng nhập.
export const useNotificationSocket = () => {
    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const userId = useAppSelector(state => state.account.user?._id);
    const socketRef = useRef<ReturnType<typeof createNotificationSocket> | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !userId) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            return;
        }

        const socket = createNotificationSocket();
        socketRef.current = socket;

        socket.on("notification:new", (payload: INotification) => {
            dispatch(pushNotification(payload));
            antdNotification.open({
                message: payload.title,
                description: payload.message,
            });
        });

        socket.connect();

        return () => {
            socket.off("notification:new");
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, userId]);
};

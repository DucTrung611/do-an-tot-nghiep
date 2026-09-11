import { callSaveJob, callUnsaveJob } from "@/config/api";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { addSavedId, removeSavedId } from "@/redux/slice/savedJobSlide";
import { HeartFilled, HeartOutlined } from "@ant-design/icons";
import { Button, notification } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface IProps {
    jobId: string;
    size?: "small" | "middle" | "large";
    // ngăn click nút tim làm nổi bọt sự kiện click của Card cha (job.card.tsx
    // gắn onClick lên toàn bộ Card để điều hướng sang trang chi tiết)
    stopPropagation?: boolean;
}

// Đọc trạng thái đã lưu hay chưa trực tiếp từ redux (savedJob.savedIds), KHÔNG
// tự fetch lúc mount — chỉ trang cha (job list/detail/saved) mới dispatch
// fetchSavedJobIds(). Nếu để component này tự fetch, mọi test render JobCard
// sẽ vấp phải MSW onUnhandledRequest: 'error' vì thiếu handler.
const SavedJobButton = (props: IProps) => {
    const { jobId, size = "middle", stopPropagation = true } = props;
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const savedIds = useAppSelector(state => state.savedJob.savedIds);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSaved = savedIds.includes(jobId);

    const handleClick = async (e: React.MouseEvent) => {
        if (stopPropagation) {
            e.stopPropagation();
        }

        if (!isAuthenticated) {
            notification.info({
                message: "Bạn cần đăng nhập",
                description: "Vui lòng đăng nhập để lưu việc làm yêu thích.",
            });
            navigate(`/login?callback=${window.location.href}`);
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        // optimistic update, rollback nếu API báo lỗi
        if (isSaved) {
            dispatch(removeSavedId(jobId));
            const res = await callUnsaveJob(jobId);
            if (!res.data) {
                dispatch(addSavedId(jobId));
                notification.error({ message: "Có lỗi xảy ra", description: res.message });
            }
        } else {
            dispatch(addSavedId(jobId));
            const res = await callSaveJob(jobId);
            if (!res.data) {
                dispatch(removeSavedId(jobId));
                notification.error({ message: "Có lỗi xảy ra", description: res.message });
            }
        }

        setIsSubmitting(false);
    };

    return (
        <Button
            type="text"
            size={size}
            aria-label={isSaved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
            icon={isSaved
                ? <HeartFilled style={{ color: "#ea1e30" }} />
                : <HeartOutlined />
            }
            onClick={handleClick}
        />
    );
};

export default SavedJobButton;

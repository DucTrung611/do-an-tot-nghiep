import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks";
import Loading from "../loading";

// Guard chỉ yêu cầu đã đăng nhập, KHÔNG gate theo role. Khác với ProtectedRoute
// (dành cho khu vực admin), vốn từ chối NORMAL_USER — các trang ứng viên như
// "Việc làm đã lưu"/"Việc làm đã ứng tuyển" phải cho phép NORMAL_USER truy cập.
const AuthRoute = (props: any) => {
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const isLoading = useAppSelector(state => state.account.isLoading);

    if (isLoading === true) {
        return <Loading />;
    }

    return isAuthenticated === true
        ? <>{props.children}</>
        : <Navigate to='/login' replace />;
}

export default AuthRoute;

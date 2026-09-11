import { useState, useEffect } from "react";
import {
    CodeOutlined,
    ContactsOutlined,
    DashOutlined,
    FileTextOutlined,
    HeartOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    RiseOutlined,
    TwitterOutlined,
    RobotOutlined,
} from "@ant-design/icons";
import { Avatar, Drawer, Dropdown, MenuProps, Space, message } from "antd";
import { Menu, ConfigProvider } from "antd";
import styles from "@/styles/client.module.scss";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FaReact } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { callLogout } from "@/config/api";
import { setLogoutAction } from "@/redux/slice/accountSlide";
import { resetNotification } from "@/redux/slice/notificationSlide";
import ManageAccount from "./modal/manage.account";
import NotificationBell from "./notification.bell";

const Header = (props: any) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const isMobile = useIsMobile();

    const isAuthenticated = useAppSelector(
        (state) => state.account.isAuthenticated,
    );
    const user = useAppSelector((state) => state.account.user);
    const [openMobileMenu, setOpenMobileMenu] = useState<boolean>(false);

    const [current, setCurrent] = useState("home");
    const location = useLocation();

    const [openMangeAccount, setOpenManageAccount] = useState<boolean>(false);

    useEffect(() => {
        setCurrent(location.pathname);
    }, [location]);

    const items: MenuProps["items"] = [
        {
            label: <Link to={"/"}>Trang Chủ</Link>,
            key: "/",
            icon: <TwitterOutlined />,
        },
        {
            label: <Link to={"/job"}>Tìm Việc Làm</Link>,
            key: "/job",
            icon: <CodeOutlined />,
        },
        {
            label: <Link to={"/company"}>Top Công ty IT</Link>,
            key: "/company",
            icon: <RiseOutlined />,
        },
        {
            label: <Link to={"/cv-matching"}>Gợi ý việc làm bằng AI</Link>,
            key: "/cv-matching",
            icon: <RobotOutlined />,
        },
    ];

    const onClick: MenuProps["onClick"] = (e) => {
        setCurrent(e.key);
    };

    const handleLogout = async () => {
        const res = await callLogout();
        if (res && res.data) {
            dispatch(setLogoutAction({}));
            dispatch(resetNotification());
            message.success("Đăng xuất thành công");
            navigate("/");
        }
    };

    const isNormalUser =
        user?.role?.name === "NORMAL_USER" ||
        user?.role?._id === "69a4efcce682bebdc6a45635";

    const itemsDropdown = [
        {
            label: <Link to={"/saved-jobs"}>Việc làm đã lưu</Link>,
            key: "saved-jobs",
            icon: <HeartOutlined />,
        },
        {
            label: <Link to={"/applied-jobs"}>Việc làm đã ứng tuyển</Link>,
            key: "applied-jobs",
            icon: <FileTextOutlined />,
        },
        {
            label: (
                <label
                    style={{ cursor: "pointer" }}
                    onClick={() => setOpenManageAccount(true)}
                >
                    Quản lý tài khoản
                </label>
            ),
            key: "manage-account",
            icon: <ContactsOutlined />,
        },
        ...(!isNormalUser
            ? [
                  {
                      label: <Link to={"/admin"}>Trang Quản Trị</Link>,
                      key: "admin",
                      icon: <DashOutlined />,
                  },
              ]
            : []),
        {
            label: (
                <label
                    style={{ cursor: "pointer" }}
                    onClick={() => handleLogout()}
                >
                    Đăng xuất
                </label>
            ),
            key: "logout",
            icon: <LogoutOutlined />,
        },
    ];

    const itemsMobiles = [...items, ...itemsDropdown];

    return (
        <>
            <div className={styles["header-section"]}>
                <div className={styles["container"]}>
                    {!isMobile ? (
                        <div style={{ display: "flex", gap: 30 }}>
                            {/* <div className={styles["brand"]}>
                                <FaReact
                                    onClick={() => navigate("/")}
                                    title="Trang chủ"
                                />
                            </div> */}
                            {/* <div>Job Connect</div> */}
                            <div className={styles["top-menu"]}>
                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorPrimary: "#fff",
                                            colorBgContainer: "#222831",
                                            colorText: "#a7a7a7",
                                        },
                                    }}
                                >
                                    <Menu
                                        // onClick={onClick}
                                        selectedKeys={[current]}
                                        mode="horizontal"
                                        items={items}
                                        style={{ flex: "1 1 auto", minWidth: 0 }}
                                    />
                                </ConfigProvider>
                                <div className={styles["extra"]}>
                                    {isAuthenticated === false ? (
                                        <Link to={"/login"}>Đăng Nhập</Link>
                                    ) : (
                                        <Space size={16} align="center">
                                            <NotificationBell />
                                            <Dropdown
                                                menu={{ items: itemsDropdown }}
                                                trigger={["click"]}
                                            >
                                                <Space
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <span>
                                                        Xin chào {user?.name}
                                                    </span>
                                                    <Avatar>
                                                        {" "}
                                                        {user?.name
                                                            ?.substring(0, 2)
                                                            ?.toUpperCase()}{" "}
                                                    </Avatar>
                                                </Space>
                                            </Dropdown>
                                        </Space>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles["header-mobile"]}>
                            <span>Your APP</span>
                            <Space size={16} align="center">
                                {isAuthenticated && <NotificationBell />}
                                <MenuFoldOutlined
                                    onClick={() => setOpenMobileMenu(true)}
                                />
                            </Space>
                        </div>
                    )}
                </div>
            </div>
            <Drawer
                title="Chức năng"
                placement="right"
                onClose={() => setOpenMobileMenu(false)}
                open={openMobileMenu}
            >
                <Menu
                    onClick={onClick}
                    selectedKeys={[current]}
                    mode="vertical"
                    items={itemsMobiles}
                />
            </Drawer>
            <ManageAccount
                open={openMangeAccount}
                onClose={setOpenManageAccount}
            />
        </>
    );
};

export default Header;

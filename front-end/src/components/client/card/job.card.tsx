import { callFetchJob } from "@/config/api";
import { LOCATION_LIST, convertSlug, getJobTypeName, getLocationName } from "@/config/utils";
import { IJob } from "@/types/backend";
import { EnvironmentOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Card, Col, Empty, Pagination, Row, Spin } from "antd";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Link, useNavigate } from "react-router-dom";
import styles from "styles/client.module.scss";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import SavedJobButton from "./saved-job.button";
dayjs.extend(relativeTime);

interface IProps {
    showPagination?: boolean;
    filterQuery?: string;
}

const JobCard = (props: IProps) => {
    const { showPagination = false, filterQuery = "" } = props;
    const isMobile = useIsMobile();

    const [displayJob, setDisplayJob] = useState<IJob[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(6);
    const [total, setTotal] = useState(0);
    const [sortQuery, setSortQuery] = useState("sort=-updatedAt");
    const navigate = useNavigate();

    useEffect(() => {
        fetchJob();
    }, [current, pageSize, filterQuery, sortQuery]);

    useEffect(() => {
        setCurrent(1);
    }, [filterQuery]);

    const fetchJob = async () => {
        setIsLoading(true);
        let query = `current=${current}&pageSize=${pageSize}`;
        if (filterQuery) {
            query += `&${filterQuery}`;
        }
        // Khi có tìm kiếm full-text, KHÔNG gửi sort mặc định: backend chỉ sắp xếp
        // theo độ liên quan ($meta textScore) khi client không chỉ định sort
        // (xem jobs.service.findAll). Luôn gửi sort=-updatedAt sẽ vô hiệu hoá
        // hoàn toàn việc xếp hạng theo độ khớp từ khoá.
        const hasKeyword = /(^|&)keyword=/.test(filterQuery ?? "");
        if (sortQuery && !hasKeyword) {
            query += `&${sortQuery}`;
        }

        const res = await callFetchJob(query);
        if (res && res.data) {
            setDisplayJob(res.data.result);
            setTotal(res.data.meta.total);
        }
        setIsLoading(false);
    };

    const handleOnchangePage = (pagination: {
        current: number;
        pageSize: number;
    }) => {
        if (pagination && pagination.current !== current) {
            setCurrent(pagination.current);
        }
        if (pagination && pagination.pageSize !== pageSize) {
            setPageSize(pagination.pageSize);
            setCurrent(1);
        }
    };

    const handleViewDetailJob = (item: IJob) => {
        const slug = convertSlug(item.name);
        navigate(`/job/${slug}?id=${item._id}`);
    };

    return (
        <div className={`${styles["card-job-section"]}`}>
            <div className={`${styles["job-content"]}`}>
                <Spin spinning={isLoading} description="Loading...">
                    <Row gutter={[20, 20]}>
                        <Col span={24}>
                            <div
                                className={
                                    isMobile
                                        ? styles["dflex-mobile"]
                                        : styles["dflex-pc"]
                                }
                            >
                                <span className={styles["title"]}>
                                    Công Việc Mới Nhất
                                </span>
                                {!showPagination && (
                                    <Link to="job">Xem tất cả</Link>
                                )}
                            </div>
                        </Col>

                        {displayJob?.map((item) => {
                            return (
                                <Col span={24} md={12} key={item._id}>
                                    <Card
                                        size="small"
                                        title={null}
                                        hoverable
                                        role="link"
                                        tabIndex={0}
                                        onClick={() =>
                                            handleViewDetailJob(item)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                handleViewDetailJob(item);
                                            }
                                        }}
                                        extra={item._id ? <SavedJobButton jobId={item._id} size="small" /> : null}
                                    >
                                        <div
                                            className={
                                                styles["card-job-content"]
                                            }
                                        >
                                            <div
                                                className={
                                                    styles["card-job-left"]
                                                }
                                            >
                                                <img
                                                    alt={item?.company?.name}
                                                    src={`${import.meta.env.VITE_BACKEND_URL}/images/company/${item?.company?.logo}`}
                                                />
                                            </div>
                                            <div
                                                className={
                                                    styles["card-job-right"]
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles["job-title"]
                                                    }
                                                >
                                                    {item.name}
                                                </div>
                                                <div
                                                    className={
                                                        styles["job-location"]
                                                    }
                                                >
                                                    <EnvironmentOutlined
                                                        style={{
                                                            color: "#58aaab",
                                                        }}
                                                    />
                                                    &nbsp;
                                                    {getLocationName(
                                                        item.location,
                                                    )}
                                                </div>
                                                <div>
                                                    <ThunderboltOutlined
                                                        style={{
                                                            color: "orange",
                                                        }}
                                                    />
                                                    &nbsp;
                                                    {(
                                                        item.salary + ""
                                                    )?.replace(
                                                        /\B(?=(\d{3})+(?!\d))/g,
                                                        ",",
                                                    )}{" "}
                                                    đ
                                                </div>
                                                {(item.jobType || item.experienceYears) && (
                                                    <div style={{ color: "#666", fontSize: 13 }}>
                                                        {item.jobType ? getJobTypeName(item.jobType) : ""}
                                                        {item.jobType && item.experienceYears ? " · " : ""}
                                                        {item.experienceYears ? `${item.experienceYears}+ năm kinh nghiệm` : ""}
                                                    </div>
                                                )}
                                                <div
                                                    className={
                                                        styles["job-updatedAt"]
                                                    }
                                                >
                                                    {dayjs(
                                                        item.updatedAt,
                                                    )
                                                        .locale("vi")
                                                        .fromNow()}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            );
                        })}

                        {(!displayJob ||
                            (displayJob && displayJob.length === 0)) &&
                            !isLoading && (
                                <div className={styles["empty"]}>
                                    <Empty description="Không có dữ liệu" />
                                </div>
                            )}
                    </Row>
                    {showPagination && (
                        <>
                            <div style={{ marginTop: 30 }}></div>
                            <Row
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                }}
                            >
                                <Pagination
                                    current={current}
                                    total={total}
                                    pageSize={pageSize}
                                    responsive
                                    onChange={(p: number, s: number) =>
                                        handleOnchangePage({
                                            current: p,
                                            pageSize: s,
                                        })
                                    }
                                />
                            </Row>
                        </>
                    )}
                </Spin>
            </div>
        </div>
    );
};

export default JobCard;

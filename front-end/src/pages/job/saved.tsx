import { fetchSavedJob } from "@/redux/slice/savedJobSlide";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { IJob } from "@/types/backend";
import { EnvironmentOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Card, Col, Divider, Empty, Pagination, Row, Spin } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "styles/client.module.scss";
import { convertSlug, getLocationName } from "@/config/utils";
import SavedJobButton from "@/components/client/card/saved-job.button";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const SavedJobPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { isFetching, meta, result } = useAppSelector(state => state.savedJob);

    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        dispatch(fetchSavedJob({ query: `current=${current}&pageSize=${pageSize}&sort=-createdAt` }));
    }, [current, pageSize, dispatch]);

    const handleViewDetailJob = (job: IJob) => {
        navigate(`/job/${convertSlug(job.name)}?id=${job._id}`);
    };

    return (
        <div className={styles["container"]} style={{ marginTop: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>Việc Làm Đã Lưu</div>
            <Divider />
            <div className={`${styles["card-job-section"]}`}>
                <div className={`${styles["job-content"]}`}>
                    <Spin spinning={isFetching}>
                        <Row gutter={[20, 20]}>
                            {result.map((item) => {
                                // job có thể là string (chưa populate) hoặc đã bị xoá => null
                                const job = typeof item.jobId === "object" ? item.jobId as IJob : null;

                                return (
                                    <Col span={24} md={12} key={item._id}>
                                        <Card
                                            size="small"
                                            hoverable={!!job}
                                            role={job ? "link" : undefined}
                                            tabIndex={job ? 0 : undefined}
                                            onClick={() => job && handleViewDetailJob(job)}
                                            extra={job?._id
                                                ? <SavedJobButton jobId={job._id} size="small" />
                                                : null
                                            }
                                        >
                                            {job ? (
                                                <div className={styles["card-job-content"]}>
                                                    <div className={styles["card-job-left"]}>
                                                        <img
                                                            alt={job?.company?.name}
                                                            src={`${import.meta.env.VITE_BACKEND_URL}/images/company/${job?.company?.logo}`}
                                                        />
                                                    </div>
                                                    <div className={styles["card-job-right"]}>
                                                        <div className={styles["job-title"]}>{job.name}</div>
                                                        <div className={styles["job-location"]}>
                                                            <EnvironmentOutlined style={{ color: "#58aaab" }} />
                                                            &nbsp;{getLocationName(job.location)}
                                                        </div>
                                                        <div>
                                                            <ThunderboltOutlined style={{ color: "orange" }} />
                                                            &nbsp;{(job.salary + "")?.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} đ
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Empty description="Tin đã gỡ" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                            )}
                                        </Card>
                                    </Col>
                                );
                            })}

                            {!isFetching && result.length === 0 && (
                                <div className={styles["empty"]}>
                                    <Empty description="Bạn chưa lưu việc làm nào" />
                                </div>
                            )}
                        </Row>

                        <div style={{ marginTop: 30 }}></div>
                        <Row style={{ display: "flex", justifyContent: "center" }}>
                            <Pagination
                                current={meta.current}
                                total={meta.total}
                                pageSize={meta.pageSize}
                                responsive
                                onChange={(p, s) => {
                                    setCurrent(p);
                                    setPageSize(s);
                                }}
                            />
                        </Row>
                    </Spin>
                </div>
            </div>
        </div>
    );
};

export default SavedJobPage;

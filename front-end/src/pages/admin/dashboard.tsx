import { Card, Col, Row, Skeleton, Statistic, Table } from "antd";
import CountUpImport from "react-countup";

// Vite's dep optimizer double-wraps this package's CJS default export, so unwrap defensively.
const CountUp = (CountUpImport as any)?.default ?? CountUpImport;
import { useEffect, useState } from "react";
import { callFetchDashboardStats } from "@/config/api";
import { IDashboardStats } from "@/types/backend";
import { RESUME_STATUS_LABEL, getLocationName } from "@/config/utils";
// @ant-design/plots kéo theo @antv/g2 (~400KB). App.tsx hiện chưa code-split
// theo route nào cả nên import tĩnh ở đây vẫn nhất quán với phần còn lại của
// app; trang admin/dashboard cũng chỉ tải khi vào khu vực /admin.
import { Bar, Column, Line, Pie } from "@ant-design/plots";

const SALARY_BUCKET_LABEL: Record<string, string> = {
    "0": "Dưới 10tr",
    "10000000": "10-20tr",
    "20000000": "20-30tr",
    "30000000": "30-50tr",
    "50000000": "50-100tr",
    "100tr+": "Trên 100tr",
};

const emptyStats: IDashboardStats = {
    totals: { users: 0, jobs: 0, companies: 0, resumes: 0, activeJobs: 0, pendingResumes: 0 },
    jobsByMonth: [],
    applicationsByMonth: [],
    resumesByStatus: [],
    topSkills: [],
    jobsByLocation: [],
    topJobsByApplications: [],
    salaryDistribution: [],
};

const DashboardPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<IDashboardStats>(emptyStats);

    const formatter = (value: number | string) => {
        return <CountUp end={Number(value)} separator="," />;
    };

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            const res = await callFetchDashboardStats(12);
            if (res && res.data) {
                setStats(res.data);
            }
            setIsLoading(false);
        };

        fetchStats();
    }, []);

    const metricCards = [
        { key: "users", title: "Total Users", value: stats.totals.users },
        { key: "jobs", title: "Total Jobs", value: stats.totals.jobs },
        { key: "companies", title: "Total Companies", value: stats.totals.companies },
        { key: "resumes", title: "Total Resumes", value: stats.totals.resumes },
        { key: "activeJobs", title: "Active Jobs", value: stats.totals.activeJobs },
        { key: "pendingResumes", title: "Pending Resumes", value: stats.totals.pendingResumes },
    ];

    return (
        <div>
            <Row gutter={[20, 20]}>
                {metricCards.map((metric) => (
                    <Col key={metric.key} span={24} md={8}>
                        <Card title={metric.title} variant="borderless">
                            <Skeleton loading={isLoading} active>
                                <Statistic value={metric.value} formatter={formatter} />
                            </Skeleton>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
                <Col span={24} md={12}>
                    <Card title="Job đăng mới theo tháng">
                        <Skeleton loading={isLoading} active>
                            <Column
                                    data={stats.jobsByMonth}
                                    xField="month"
                                    yField="count"
                                    height={260}
                                />
                        </Skeleton>
                    </Card>
                </Col>
                <Col span={24} md={12}>
                    <Card title="Hồ sơ ứng tuyển theo tháng">
                        <Skeleton loading={isLoading} active>
                            <Line
                                    data={stats.applicationsByMonth}
                                    xField="month"
                                    yField="count"
                                    height={260}
                                />
                        </Skeleton>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
                <Col span={24} md={8}>
                    <Card title="Hồ sơ theo trạng thái">
                        <Skeleton loading={isLoading} active>
                            <Pie
                                    data={stats.resumesByStatus.map(item => ({
                                        ...item,
                                        statusLabel: RESUME_STATUS_LABEL[item.status] ?? item.status,
                                    }))}
                                    angleField="count"
                                    colorField="statusLabel"
                                    height={260}
                                />
                        </Skeleton>
                    </Card>
                </Col>
                <Col span={24} md={8}>
                    <Card title="Top kỹ năng được tuyển">
                        <Skeleton loading={isLoading} active>
                            <Bar
                                    data={stats.topSkills}
                                    xField="skill"
                                    yField="count"
                                    height={260}
                                />
                        </Skeleton>
                    </Card>
                </Col>
                <Col span={24} md={8}>
                    <Card title="Phân bố mức lương">
                        <Skeleton loading={isLoading} active>
                            <Column
                                    data={stats.salaryDistribution.map(item => ({
                                        bucket: SALARY_BUCKET_LABEL[String(item._id)] ?? String(item._id),
                                        count: item.count,
                                    }))}
                                    xField="bucket"
                                    yField="count"
                                    height={260}
                                />
                        </Skeleton>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
                <Col span={24} md={12}>
                    <Card title="Job theo địa điểm">
                        <Skeleton loading={isLoading} active>
                            <Column
                                    data={stats.jobsByLocation.map(item => ({
                                        location: getLocationName(item.location),
                                        count: item.count,
                                    }))}
                                    xField="location"
                                    yField="count"
                                    height={260}
                                />
                        </Skeleton>
                    </Card>
                </Col>
                <Col span={24} md={12}>
                    <Card title="Top job nhiều hồ sơ ứng tuyển nhất">
                        <Skeleton loading={isLoading} active>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={stats.topJobsByApplications}
                                rowKey="jobId"
                                columns={[
                                    { title: "Job", dataIndex: "jobName" },
                                    { title: "Công ty", dataIndex: "companyName" },
                                    { title: "Số hồ sơ", dataIndex: "count", align: "right" },
                                ]}
                            />
                        </Skeleton>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;

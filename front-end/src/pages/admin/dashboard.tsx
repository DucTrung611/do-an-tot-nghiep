import { Card, Col, Row, Skeleton, Statistic } from "antd";
import CountUp from "react-countup";
import { useEffect, useState } from "react";
import {
    callFetchCompany,
    callFetchJob,
    callFetchPermission,
    callFetchResume,
    callFetchRole,
    callFetchUser,
} from "@/config/api";

const DashboardPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        users: 0,
        jobs: 0,
        companies: 0,
        resumes: 0,
        permissions: 0,
        roles: 0,
    });

    const formatter = (value: number | string) => {
        return <CountUp end={Number(value)} separator="," />;
    };

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);

            const query = "current=1&pageSize=1";

            const [
                usersRes,
                jobsRes,
                companiesRes,
                resumesRes,
                permissionsRes,
                rolesRes,
            ] = await Promise.all([
                callFetchUser(query),
                callFetchJob(query),
                callFetchCompany(query),
                callFetchResume(query),
                callFetchPermission(query),
                callFetchRole(query),
            ]);

            setStats({
                users: usersRes?.data?.meta?.total ?? 0,
                jobs: jobsRes?.data?.meta?.total ?? 0,
                companies: companiesRes?.data?.meta?.total ?? 0,
                resumes: resumesRes?.data?.meta?.total ?? 0,
                permissions: permissionsRes?.data?.meta?.total ?? 0,
                roles: rolesRes?.data?.meta?.total ?? 0,
            });

            setIsLoading(false);
        };

        fetchStats();
    }, []);

    const metricCards = [
        { key: "users", title: "Total Users", value: stats.users },
        { key: "jobs", title: "Total Jobs", value: stats.jobs },
        { key: "companies", title: "Total Companies", value: stats.companies },
        { key: "resumes", title: "Total Resumes", value: stats.resumes },
        {
            key: "permissions",
            title: "Total Permissions",
            value: stats.permissions,
        },
        { key: "roles", title: "Total Roles", value: stats.roles },
    ];

    return (
        <Row gutter={[20, 20]}>
            {metricCards.map((metric) => (
                <Col key={metric.key} span={24} md={8}>
                    <Card title={metric.title} bordered={false}>
                        <Skeleton loading={isLoading} active>
                            <Statistic
                                value={metric.value}
                                formatter={formatter}
                            />
                        </Skeleton>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default DashboardPage;

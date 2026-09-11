import { callFetchResumeByUser } from "@/config/api";
import { RESUME_STATUS_COLOR, RESUME_STATUS_LABEL } from "@/config/utils";
import { IResume } from "@/types/backend";
import { Divider, Table, Tag, Timeline } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "styles/client.module.scss";

const AppliedJobPage = () => {
    const [listCV, setListCV] = useState<IResume[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    useEffect(() => {
        const init = async () => {
            setIsFetching(true);
            const res = await callFetchResumeByUser();
            if (res && res.data) {
                setListCV(res.data as IResume[]);
            }
            setIsFetching(false);
        };
        init();
    }, []);

    const columns: ColumnsType<IResume> = [
        {
            title: "STT",
            key: "index",
            width: 50,
            align: "center",
            render: (_text, _record, index) => index + 1,
        },
        {
            title: "Công việc",
            dataIndex: ["jobId", "name"],
            render: (_value, record) => {
                const job = typeof record.jobId === "object" ? record.jobId : null;
                return job?.name ?? "(tin đã gỡ)";
            },
        },
        {
            title: "Công ty",
            dataIndex: ["companyId", "name"],
            render: (_value, record) => {
                const company = typeof record.companyId === "object" ? record.companyId : null;
                return company?.name ?? "(đã gỡ)";
            },
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            render: (status: string) => (
                <Tag color={RESUME_STATUS_COLOR[status] ?? "default"}>
                    {RESUME_STATUS_LABEL[status] ?? status}
                </Tag>
            ),
        },
        {
            title: "Ngày ứng tuyển",
            dataIndex: "createdAt",
            render: (_value, record) => dayjs(record.createdAt).format("DD-MM-YYYY HH:mm:ss"),
        },
        {
            title: "",
            key: "action",
            render: (_value, record) => (
                <a
                    href={`${import.meta.env.VITE_BACKEND_URL}/images/resume/${record?.url}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    Xem CV
                </a>
            ),
        },
    ];

    return (
        <div className={styles["container"]} style={{ marginTop: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>Việc Làm Đã Ứng Tuyển</div>
            <Divider />
            <Table<IResume>
                rowKey="_id"
                columns={columns}
                dataSource={listCV}
                loading={isFetching}
                pagination={{ pageSize: 10 }}
                expandable={{
                    // dựng timeline từ resume.history, mốc cũ nhất lên đầu
                    expandedRowRender: (record) => {
                        const history = [...(record.history ?? [])].sort(
                            (a, b) => dayjs(a.updatedAt).valueOf() - dayjs(b.updatedAt).valueOf()
                        );
                        return (
                            <Timeline
                                items={history.map((h) => ({
                                    color: RESUME_STATUS_COLOR[h.status] ?? "gray",
                                    children: (
                                        <div>
                                            <strong>{RESUME_STATUS_LABEL[h.status] ?? h.status}</strong>
                                            <div style={{ color: "#888", fontSize: 12 }}>
                                                {dayjs(h.updatedAt).format("DD/MM/YYYY HH:mm")}
                                                {h.updatedBy?.email ? ` · ${h.updatedBy.email}` : ""}
                                            </div>
                                        </div>
                                    ),
                                }))}
                            />
                        );
                    },
                    rowExpandable: (record) => !!record.history?.length,
                }}
                locale={{ emptyText: "Bạn chưa ứng tuyển việc làm nào" }}
            />
            <div style={{ marginTop: 10 }}>
                <Link to="/job">Tìm thêm việc làm</Link>
            </div>
        </div>
    );
};

export default AppliedJobPage;

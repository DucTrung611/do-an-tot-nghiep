import { Col, Row, Input } from "antd";
import { useState } from "react";
import styles from "styles/client.module.scss";
import CompanyCard from "@/components/client/card/company.card";

const buildCompanyFilter = (searchValue: string) => {
    if (!searchValue) return "";
    // Use regex search via query string like other parts of the app
    // Example: name=/VNG/i
    return `name=/${encodeURIComponent(searchValue)}/i`;
};

const ClientCompanyPage = (props: any) => {
    const [search, setSearch] = useState("");
    const [filterQuery, setFilterQuery] = useState("");

    const handleSearch = (value: string) => {
        setSearch(value);
        setFilterQuery(buildCompanyFilter(value));
    };

    return (
        <div className={styles["container"]} style={{ marginTop: 20 }}>
            <Row gutter={[20, 20]}>
                <Col span={24}>
                    <Input.Search
                        placeholder="Tìm theo tên công ty"
                        allowClear
                        enterButton="Tìm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onSearch={handleSearch}
                    />
                </Col>

                <Col span={24}>
                    <CompanyCard
                        showPagination={true}
                        filterQuery={filterQuery}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default ClientCompanyPage;

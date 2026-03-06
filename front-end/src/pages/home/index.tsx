import { Divider } from "antd";
import styles from "styles/client.module.scss";
import SearchClient from "@/components/client/search.client";
import JobCard from "@/components/client/card/job.card";
import CompanyCard from "@/components/client/card/company.card";
import { useState } from "react";

const HomePage = () => {
    const [filterQuery, setFilterQuery] = useState("");

    return (
        <div className={`${styles["container"]} ${styles["home-section"]}`}>
            <div className="search-content" style={{ marginTop: 20 }}>
                <SearchClient onSearch={setFilterQuery} />
            </div>
            <Divider />
            <JobCard filterQuery={filterQuery} />

            <div style={{ margin: 50 }}></div>
            <Divider />
            <CompanyCard />
        </div>
    );
};

export default HomePage;

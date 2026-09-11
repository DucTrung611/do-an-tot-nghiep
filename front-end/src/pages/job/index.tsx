import SearchClient from '@/components/client/search.client';
import { Col, Divider, Row } from 'antd';
import styles from 'styles/client.module.scss';
import JobCard from '@/components/client/card/job.card';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchSavedJobIds } from '@/redux/slice/savedJobSlide';

const ClientJobPage = (props: any) => {
    const [filterQuery, setFilterQuery] = useState("");
    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);

    // để nút tim trên từng job card tô đúng trạng thái đã lưu/chưa lưu
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchSavedJobIds());
        }
    }, [isAuthenticated, dispatch]);

    return (
        <div className={styles["container"]} style={{ marginTop: 20 }}>
            <Row gutter={[20, 20]}>
                <Col span={24}>
                    <SearchClient onSearch={setFilterQuery} />
                </Col>
                <Divider />

                <Col span={24}>
                    <JobCard
                        showPagination={true}
                        filterQuery={filterQuery}
                    />
                </Col>
            </Row>
        </div>
    )
}

export default ClientJobPage;

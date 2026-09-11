import { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Empty,
    List,
    Progress,
    Result,
    Row,
    Spin,
    Steps,
    Tabs,
    Tag,
    Upload,
    message,
    notification,
} from 'antd';
import type { UploadProps } from 'antd';
import { InboxOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import styles from 'styles/client.module.scss';
import { useAppSelector } from '@/redux/hooks';
import { callAnalyzeCv, callFetchCvHistory } from '@/config/api';
import { convertSlug, getLocationName } from '@/config/utils';
import { ICvAnalysis, ICvJobMatch } from '@/types/backend';

/** Ước lượng thời gian mỗi bước để đẩy Steps — chỉ mang tính chỉ báo. */
const STEP_TIMINGS_MS = [1500, 12000];

const scoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#1677ff';
    return '#fa8c16';
};

const CvMatchingPage = () => {
    const isAuthenticated = useAppSelector((state) => state.account.isAuthenticated);
    const isLoadingAccount = useAppSelector((state) => state.account.isLoading);
    const navigate = useNavigate();

    const [cvFile, setCvFile] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [result, setResult] = useState<ICvAnalysis | null>(null);
    const [history, setHistory] = useState<ICvAnalysis[]>([]);
    const [activeTab, setActiveTab] = useState<string>('analyze');

    const fetchHistory = async () => {
        const res = await callFetchCvHistory();
        if (res && res.data) setHistory(res.data);
    };

    useEffect(() => {
        if (isAuthenticated) fetchHistory();
    }, [isAuthenticated]);

    // Đẩy Steps theo mốc thời gian ước lượng. Backend là một request đơn, không
    // stream tiến trình thật, nên đây chỉ để người dùng thấy hệ thống đang chạy.
    useEffect(() => {
        if (!isAnalyzing) return;
        const timers = STEP_TIMINGS_MS.map((delay, index) =>
            setTimeout(() => setCurrentStep(index + 1), delay),
        );
        return () => timers.forEach(clearTimeout);
    }, [isAnalyzing]);

    const propsUpload: UploadProps = {
        maxCount: 1,
        multiple: false,
        accept: '.pdf,.docx,application/pdf',
        // Trả false để chặn auto-upload: lời gọi này mất 15-40s nên phải để người
        // dùng chủ động bấm phân tích, không upload ngầm như modal "Rải CV".
        beforeUpload: (file) => {
            setCvFile(file);
            setResult(null);
            return false;
        },
        onRemove: () => {
            setCvFile(null);
            return true;
        },
        fileList: cvFile ? [cvFile] : [],
    };

    const handleAnalyze = async () => {
        if (!cvFile) {
            message.error('Vui lòng chọn file CV!');
            return;
        }

        setIsAnalyzing(true);
        setCurrentStep(0);
        setResult(null);

        const res = await callAnalyzeCv(cvFile);

        setIsAnalyzing(false);

        if (res && res.data) {
            setResult(res.data);
            message.success('Phân tích CV thành công!');
            fetchHistory();
        } else {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: res.message,
            });
        }
    };

    const goToJob = (match: ICvJobMatch) => {
        // Segment đầu chỉ là slug cho SEO, id thật đi qua query `?id=`.
        navigate(`/job/${convertSlug(match.jobName)}?id=${match.jobId}`);
    };

    if (isLoadingAccount) {
        return (
            <div className={styles['container']} style={{ marginTop: 20, textAlign: 'center' }}>
                <Spin />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Không dùng ProtectedRoute vì RoleBaseRoute chặn role NORMAL_USER — tức
        // nó là cổng admin, sẽ khoá đúng nhóm người dùng tính năng này nhắm tới.
        return (
            <div className={styles['container']} style={{ marginTop: 20 }}>
                <Result
                    icon={<RobotOutlined style={{ color: '#1677ff' }} />}
                    title="Gợi ý việc làm bằng AI"
                    subTitle="Vui lòng đăng nhập để tải CV lên và nhận danh sách việc làm phù hợp với bạn."
                    extra={
                        <Button
                            type="primary"
                            onClick={() => navigate(`/login?callback=${window.location.href}`)}
                        >
                            Đăng nhập
                        </Button>
                    }
                />
            </div>
        );
    }

    const renderProfile = (analysis: ICvAnalysis) => {
        const { profile } = analysis;
        // Skill CV có nêu nhưng không map được vào taxonomy của hệ thống.
        const unmappedSkills = (profile.rawSkills ?? []).filter(
            (raw) => !(profile.skills ?? []).some(
                (skill) => skill.toLowerCase() === raw.toLowerCase(),
            ),
        );

        return (
            <Card title="AI đọc được gì từ CV của bạn" style={{ marginBottom: 20 }}>
                <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Họ tên">
                        {profile.fullName || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Vị trí">
                        {profile.currentTitle || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Kinh nghiệm">
                        {profile.yearsOfExperience > 0
                            ? `${profile.yearsOfExperience} năm`
                            : 'Chưa có kinh nghiệm'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Level">
                        {profile.level ? <Tag color="blue">{profile.level}</Tag> : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa điểm" span={2}>
                        {profile.locations?.length
                            ? profile.locations.map((loc) => (
                                <Tag key={loc}>{getLocationName(loc)}</Tag>
                            ))
                            : '—'}
                    </Descriptions.Item>
                </Descriptions>

                {profile.summary && (
                    <p style={{ marginTop: 12, marginBottom: 12, color: '#595959' }}>
                        {profile.summary}
                    </p>
                )}

                <div style={{ marginTop: 8 }}>
                    <strong>Kỹ năng khớp với hệ thống: </strong>
                    {profile.skills?.length
                        ? profile.skills.map((skill) => (
                            <Tag color="green" key={skill}>{skill}</Tag>
                        ))
                        : <span style={{ color: '#8c8c8c' }}>Không nhận diện được kỹ năng nào</span>}
                </div>

                {unmappedSkills.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <strong>Kỹ năng khác trong CV: </strong>
                        {unmappedSkills.map((skill) => (
                            <Tag key={skill}>{skill}</Tag>
                        ))}
                    </div>
                )}
            </Card>
        );
    };

    const renderMatches = (analysis: ICvAnalysis) => {
        if (!analysis.matches?.length) {
            return (
                <Card>
                    <Empty description="Chưa tìm thấy việc làm phù hợp với CV của bạn. Bạn có thể thử lại sau khi hệ thống có thêm tin tuyển dụng mới." />
                </Card>
            );
        }

        return (
            <Card title={`${analysis.matches.length} việc làm phù hợp nhất`}>
                <Row gutter={[16, 16]}>
                    {analysis.matches.map((match) => (
                        <Col span={24} key={match.jobId}>
                            <Card
                                size="small"
                                hoverable
                                role="link"
                                tabIndex={0}
                                onClick={() => goToJob(match)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        goToJob(match);
                                    }
                                }}
                            >
                                <Row gutter={[16, 12]} align="middle">
                                    <Col flex="none">
                                        <Progress
                                            type="circle"
                                            percent={match.score}
                                            size={64}
                                            strokeColor={scoreColor(match.score)}
                                            format={(percent) => `${percent}`}
                                        />
                                    </Col>
                                    <Col flex="auto">
                                        <div style={{ fontWeight: 600, fontSize: 16 }}>
                                            {match.jobName}
                                        </div>
                                        <div style={{ color: '#8c8c8c', marginBottom: 6 }}>
                                            {match.companyName}
                                        </div>
                                        <div style={{ marginBottom: 8 }}>{match.reason}</div>

                                        {match.matchedSkills?.length > 0 && (
                                            <div style={{ marginBottom: 4 }}>
                                                <span style={{ color: '#8c8c8c' }}>Bạn đã có: </span>
                                                {match.matchedSkills.map((skill) => (
                                                    <Tag color="green" key={skill}>{skill}</Tag>
                                                ))}
                                            </div>
                                        )}

                                        {match.missingSkills?.length > 0 && (
                                            <div>
                                                <span style={{ color: '#8c8c8c' }}>Còn thiếu: </span>
                                                {match.missingSkills.map((skill) => (
                                                    <Tag color="red" key={skill}>{skill}</Tag>
                                                ))}
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card>
        );
    };

    const analyzeTab = (
        <>
            <Card style={{ marginBottom: 20 }}>
                <Alert
                    type="info"
                    showIcon
                    title="Tải CV lên, AI sẽ đọc CV và tìm những việc làm phù hợp nhất trong hệ thống."
                    description="Hỗ trợ file .pdf và .docx, dung lượng tối đa 5MB. Quá trình phân tích có thể mất 15-40 giây."
                    style={{ marginBottom: 16 }}
                />

                <Upload.Dragger {...propsUpload} disabled={isAnalyzing}>
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">Bấm hoặc kéo file CV vào đây</p>
                    <p className="ant-upload-hint">Chỉ hỗ trợ .pdf hoặc .docx</p>
                </Upload.Dragger>

                <Button
                    type="primary"
                    size="large"
                    icon={<RobotOutlined />}
                    loading={isAnalyzing}
                    disabled={!cvFile}
                    onClick={handleAnalyze}
                    style={{ marginTop: 16 }}
                    block
                >
                    {isAnalyzing ? 'AI đang phân tích...' : 'Phân tích CV và tìm việc phù hợp'}
                </Button>
            </Card>

            {isAnalyzing && (
                <Card style={{ marginBottom: 20 }}>
                    <Steps
                        current={currentStep}
                        size="small"
                        items={[
                            { title: 'Đọc file CV' },
                            { title: 'AI phân tích CV' },
                            { title: 'Tìm việc phù hợp' },
                        ]}
                    />
                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <Spin description="Vui lòng không đóng trang..." size="large">
                            <div style={{ padding: 24 }} />
                        </Spin>
                    </div>
                    <p style={{ textAlign: 'center', color: '#8c8c8c', marginTop: 8 }}>
                        Tiến trình hiển thị mang tính ước lượng.
                    </p>
                </Card>
            )}

            {result && !isAnalyzing && (
                <>
                    {renderProfile(result)}
                    {renderMatches(result)}
                </>
            )}
        </>
    );

    const historyTab = history.length ? (
        <List
            dataSource={history}
            renderItem={(item) => (
                <List.Item
                    actions={[
                        <Button
                            type="link"
                            key="view"
                            onClick={() => {
                                setResult(item);
                                setActiveTab('analyze');
                            }}
                        >
                            Xem lại
                        </Button>,
                    ]}
                >
                    <List.Item.Meta
                        title={item.fileName}
                        description={
                            <>
                                {item.createdAt
                                    ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')
                                    : ''}
                                {' · '}
                                {item.matches?.length ?? 0} việc làm phù hợp
                            </>
                        }
                    />
                </List.Item>
            )}
        />
    ) : (
        <Empty description="Bạn chưa có lần phân tích CV nào" />
    );

    return (
        <div
            className={`${styles['container']} ${styles['cv-matching-section']}`}
            style={{ marginTop: 20 }}
        >
            <Row gutter={[20, 20]}>
                <Col span={24}>
                    <h2 className={styles['title']}>
                        <RobotOutlined /> Gợi ý việc làm bằng AI
                    </h2>
                    <Divider />
                </Col>
                <Col span={24}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={[
                            { key: 'analyze', label: 'Phân tích CV', children: analyzeTab },
                            { key: 'history', label: 'Lịch sử', children: historyTab },
                        ]}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default CvMatchingPage;

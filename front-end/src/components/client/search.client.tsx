import { Button, Col, Form, Input, Row, Select } from "antd";
import { EnvironmentOutlined, MonitorOutlined, SearchOutlined } from "@ant-design/icons";
import { EXPERIENCE_LIST, JOB_TYPE_LIST, LOCATION_LIST, SALARY_RANGE_LIST, SKILLS_LIST } from "@/config/utils";
import { ProForm } from "@ant-design/pro-components";

interface IProps {
    onSearch?: (filterQuery: string) => void;
}

const SearchClient = (props: IProps) => {
    const { onSearch } = props;
    const optionsSkills = SKILLS_LIST;
    const optionsLocations = LOCATION_LIST;
    const [form] = Form.useForm();

    const escapeRegExp = (value: string) => {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const onFinish = async (values: any) => {
        const skills: string[] = values?.skills ?? [];
        const locations: string[] = values?.location ?? [];
        const jobTypes: string[] = values?.jobType ?? [];
        const keyword: string = values?.keyword?.trim() ?? "";
        const salaryRange = SALARY_RANGE_LIST.find(item => item.value === values?.salaryRange);
        const experience = EXPERIENCE_LIST.find(item => item.value === values?.experience);
        const queryParts: string[] = [];

        // free text nên phải encode riêng, khác với skills/location đang build
        // theo dạng mongo-regex thủ công ở dưới
        if (keyword) {
            queryParts.push(`keyword=${encodeURIComponent(keyword)}`);
        }

        if (skills.length) {
            const skillsRegex = skills
                .map((item) => escapeRegExp(item))
                .join("|");
            queryParts.push(`skills=/${skillsRegex}/i`);
        }

        const validLocations = locations.filter((item) => item !== "ALL");
        if (validLocations.length) {
            const locationRegex = validLocations
                .map((item) => escapeRegExp(item))
                .join("|");
            queryParts.push(`location=/${locationRegex}/i`);
        }

        if (jobTypes.length) {
            queryParts.push(`jobType=${jobTypes.join(",")}`);
        }

        if (salaryRange?.salaryMin !== undefined) {
            queryParts.push(`salaryMin=${salaryRange.salaryMin}`);
        }
        if (salaryRange?.salaryMax !== undefined) {
            queryParts.push(`salaryMax=${salaryRange.salaryMax}`);
        }

        if (experience?.expMin !== undefined) {
            queryParts.push(`expMin=${experience.expMin}`);
        }
        if (experience?.expMax !== undefined) {
            queryParts.push(`expMax=${experience.expMax}`);
        }

        onSearch?.(queryParts.join("&"));
    };

    return (
        <ProForm
            form={form}
            onFinish={onFinish}
            submitter={{
                render: () => <></>,
            }}
        >
            <Row gutter={[20, 20]}>
                <Col span={24}>
                    <h2>Tìm Kiếm Việc Làm</h2>
                </Col>
                <Col span={24} md={8}>
                    <ProForm.Item name="keyword">
                        <Input
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="Tên công việc, mô tả..."
                        />
                    </ProForm.Item>
                </Col>
                <Col span={24} md={8}>
                    <ProForm.Item name="skills">
                        <Select
                            mode="multiple"
                            allowClear
                            suffixIcon={null}
                            style={{ width: "100%" }}
                            placeholder={
                                <>
                                    <MonitorOutlined /> Tìm theo kỹ năng...
                                </>
                            }
                            optionLabelProp="label"
                            options={optionsSkills}
                        />
                    </ProForm.Item>
                </Col>
                <Col span={12} md={4}>
                    <ProForm.Item name="location">
                        <Select
                            mode="multiple"
                            allowClear
                            suffixIcon={null}
                            style={{ width: "100%" }}
                            placeholder={
                                <>
                                    <EnvironmentOutlined /> Địa điểm...
                                </>
                            }
                            optionLabelProp="label"
                            options={optionsLocations}
                        />
                    </ProForm.Item>
                </Col>
                <Col span={12} md={4}>
                    <ProForm.Item name="jobType">
                        <Select
                            mode="multiple"
                            allowClear
                            suffixIcon={null}
                            style={{ width: "100%" }}
                            placeholder="Hình thức làm việc..."
                            optionLabelProp="label"
                            options={JOB_TYPE_LIST}
                        />
                    </ProForm.Item>
                </Col>
                <Col span={12} md={4}>
                    <ProForm.Item name="salaryRange">
                        <Select
                            allowClear
                            style={{ width: "100%" }}
                            placeholder="Mức lương..."
                            options={SALARY_RANGE_LIST}
                        />
                    </ProForm.Item>
                </Col>
                <Col span={12} md={4}>
                    <ProForm.Item name="experience">
                        <Select
                            allowClear
                            style={{ width: "100%" }}
                            placeholder="Kinh nghiệm..."
                            options={EXPERIENCE_LIST}
                        />
                    </ProForm.Item>
                </Col>
                <Col span={24} md={4}>
                    <Button type="primary" block onClick={() => form.submit()}>
                        Search
                    </Button>
                </Col>
            </Row>
        </ProForm>
    );
};
export default SearchClient;

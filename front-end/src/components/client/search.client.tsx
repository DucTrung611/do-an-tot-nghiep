import { Button, Col, Form, Row, Select } from "antd";
import { EnvironmentOutlined, MonitorOutlined } from "@ant-design/icons";
import { LOCATION_LIST, SKILLS_LIST } from "@/config/utils";
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
        const queryParts: string[] = [];

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
                <Col span={24} md={16}>
                    <ProForm.Item name="skills">
                        <Select
                            mode="multiple"
                            allowClear
                            showArrow={false}
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
                            showArrow={false}
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
                    <Button type="primary" onClick={() => form.submit()}>
                        Search
                    </Button>
                </Col>
            </Row>
        </ProForm>
    );
};
export default SearchClient;

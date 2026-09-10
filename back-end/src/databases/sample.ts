export const ADMIN_ROLE = "SUPER_ADMIN";
export const USER_ROLE = "NORMAL_USER";

export const INIT_PERMISSIONS = [
    {
        "_id": "648ab415f4328bd3153ee211",
        "name": "Get Company with paginate",
        "apiPath": "/api/v1/companies",
        "method": "GET",
        "module": "COMPANIES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T06:47:49.369Z",
        "updatedAt": "2023-06-15T06:54:05.131Z",
        "__v": 0,
        "updatedBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        }
    },
    {
        "_id": "648ab436f4328bd3153ee216",
        "name": "Create Company",
        "apiPath": "/api/v1/companies",
        "method": "POST",
        "module": "COMPANIES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T06:48:22.224Z",
        "updatedAt": "2023-06-15T06:48:22.224Z",
        "__v": 0
    },
    {
        "_id": "648ab4d5f4328bd3153ee21b",
        "name": "Update Company",
        "apiPath": "/api/v1/companies/:id",
        "method": "PATCH",
        "module": "COMPANIES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T06:51:01.241Z",
        "updatedAt": "2023-06-15T06:51:01.241Z",
        "__v": 0
    },
    {
        "_id": "648ab4ebf4328bd3153ee220",
        "name": "Delete Company",
        "apiPath": "/api/v1/companies/:id",
        "method": "DELETE",
        "module": "COMPANIES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T06:51:23.973Z",
        "updatedAt": "2023-06-15T06:51:23.973Z",
        "__v": 0
    },
    {
        "_id": "648ab5a8072f2a2ef910638d",
        "name": "Get Company by id",
        "apiPath": "/api/v1/companies/:id",
        "method": "GET",
        "module": "COMPANIES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T06:54:32.799Z",
        "updatedAt": "2023-06-15T06:54:32.799Z",
        "__v": 0
    },
    {
        "_id": "648ab6d3fa16b294212e4033",
        "name": "Create User",
        "apiPath": "/api/v1/users",
        "method": "POST",
        "module": "USERS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T06:59:31.898Z",
        "updatedAt": "2023-06-15T06:59:31.898Z",
        "__v": 0
    },
    {
        "_id": "648ab6e7fa16b294212e4038",
        "name": "Get User by Id",
        "apiPath": "/api/v1/users/:id",
        "method": "GET",
        "module": "USERS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T06:59:51.041Z",
        "updatedAt": "2023-06-15T06:59:51.041Z",
        "__v": 0
    },
    {
        "_id": "648ab6fdfa16b294212e403d",
        "name": "Get User with paginate",
        "apiPath": "/api/v1/users",
        "method": "GET",
        "module": "USERS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T07:00:13.364Z",
        "updatedAt": "2023-06-15T07:00:13.364Z",
        "__v": 0
    },
    {
        "_id": "648ab719fa16b294212e4042",
        "name": "Update User",
        "apiPath": "/api/v1/users/:id",
        "method": "PATCH",
        "module": "USERS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T07:00:41.934Z",
        "updatedAt": "2023-06-15T07:00:41.934Z",
        "__v": 0
    },
    {
        "_id": "648ab728fa16b294212e4047",
        "name": "Delete User",
        "apiPath": "/api/v1/users/:id",
        "method": "DELETE",
        "module": "USERS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T07:00:56.274Z",
        "updatedAt": "2023-06-15T07:00:56.274Z",
        "__v": 0
    },
    {
        "_id": "648ab750fa16b294212e404c",
        "name": "Upload Single File",
        "apiPath": "/api/v1/files/upload",
        "method": "POST",
        "module": "FILES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T07:01:36.923Z",
        "updatedAt": "2023-06-15T07:01:36.923Z",
        "__v": 0
    },
    {
        "_id": "648ad488dafdb9754f40b846",
        "name": "Create a Job",
        "apiPath": "/api/v1/jobs",
        "method": "POST",
        "module": "JOBS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:06:16.508Z",
        "updatedAt": "2023-06-15T09:06:16.508Z",
        "__v": 0
    },
    {
        "_id": "648ad499dafdb9754f40b84b",
        "name": "Get a job by id",
        "apiPath": "/api/v1/jobs/:id",
        "method": "GET",
        "module": "JOBS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:06:33.697Z",
        "updatedAt": "2023-06-15T09:06:33.697Z",
        "__v": 0
    },
    {
        "_id": "648ad4a6dafdb9754f40b850",
        "name": "Update a Job",
        "apiPath": "/api/v1/jobs/:id",
        "method": "PATCH",
        "module": "JOBS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:06:46.085Z",
        "updatedAt": "2023-06-15T09:06:46.085Z",
        "__v": 0
    },
    {
        "_id": "648ad4ccdafdb9754f40b859",
        "name": "Get Job with paginate",
        "apiPath": "/api/v1/jobs",
        "method": "GET",
        "module": "JOBS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:07:24.175Z",
        "updatedAt": "2023-06-15T09:07:24.175Z",
        "__v": 0
    },
    {
        "_id": "648ad4d9dafdb9754f40b85e",
        "name": "Delete a Job",
        "apiPath": "/api/v1/jobs/:id",
        "method": "DELETE",
        "module": "JOBS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:07:37.896Z",
        "updatedAt": "2023-06-15T09:07:37.896Z",
        "__v": 0
    },
    {
        "_id": "648ad4fedafdb9754f40b863",
        "name": "Create a Resume",
        "apiPath": "/api/v1/resumes",
        "method": "POST",
        "module": "RESUMES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:08:14.659Z",
        "updatedAt": "2023-06-15T09:08:14.659Z",
        "__v": 0
    },
    {
        "_id": "648ad511dafdb9754f40b868",
        "name": "Fetch resume with paginate",
        "apiPath": "/api/v1/resumes",
        "method": "GET",
        "module": "RESUMES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:08:33.395Z",
        "updatedAt": "2023-06-15T09:08:33.395Z",
        "__v": 0
    },
    {
        "_id": "648ad522dafdb9754f40b86d",
        "name": "Get resume by id",
        "apiPath": "/api/v1/resumes/:id",
        "method": "GET",
        "module": "RESUMES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:08:50.801Z",
        "updatedAt": "2023-06-15T09:08:50.801Z",
        "__v": 0
    },
    {
        "_id": "648ad53bdafdb9754f40b872",
        "name": "Delete a resume",
        "apiPath": "/api/v1/resumes/:id",
        "method": "DELETE",
        "module": "RESUMES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:09:15.785Z",
        "updatedAt": "2023-06-15T09:09:15.785Z",
        "__v": 0
    },
    {
        "_id": "648ad555dafdb9754f40b877",
        "name": "Update resume status",
        "apiPath": "/api/v1/resumes/:id",
        "method": "PATCH",
        "module": "RESUMES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:09:41.694Z",
        "updatedAt": "2023-06-15T09:09:41.694Z",
        "__v": 0
    },
    {
        "_id": "648ad56ddafdb9754f40b87c",
        "name": "Fetch resumes by user",
        "apiPath": "/api/v1/resumes/by-user",
        "method": "POST",
        "module": "RESUMES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:10:05.961Z",
        "updatedAt": "2023-06-15T09:10:05.961Z",
        "__v": 0
    },
    {
        "_id": "648ad59adafdb9754f40b881",
        "name": "Create a permission",
        "apiPath": "/api/v1/permissions",
        "method": "POST",
        "module": "PERMISSIONS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:10:50.946Z",
        "updatedAt": "2023-06-15T09:10:50.946Z",
        "__v": 0
    },
    {
        "_id": "648ad5aedafdb9754f40b886",
        "name": "Fetch Permission with paginate",
        "apiPath": "/api/v1/permissions",
        "method": "GET",
        "module": "PERMISSIONS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:11:10.914Z",
        "updatedAt": "2023-06-15T09:11:10.914Z",
        "__v": 0
    },
    {
        "_id": "648ad5c5dafdb9754f40b88b",
        "name": "Fetch permission by id",
        "apiPath": "/api/v1/permissions/:id",
        "method": "GET",
        "module": "PERMISSIONS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:11:33.234Z",
        "updatedAt": "2023-06-15T09:11:33.234Z",
        "__v": 0
    },
    {
        "_id": "648ad5d4dafdb9754f40b890",
        "name": "Update a permission",
        "apiPath": "/api/v1/permissions/:id",
        "method": "PATCH",
        "module": "PERMISSIONS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:11:48.081Z",
        "updatedAt": "2023-06-15T09:11:48.081Z",
        "__v": 0
    },
    {
        "_id": "648ad5ebdafdb9754f40b895",
        "name": "Delete a permission",
        "apiPath": "/api/v1/permissions/:id",
        "method": "DELETE",
        "module": "PERMISSIONS",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:12:11.323Z",
        "updatedAt": "2023-06-15T09:12:11.323Z",
        "__v": 0
    },
    {
        "_id": "648ad613dafdb9754f40b89a",
        "name": "Create Role",
        "apiPath": "/api/v1/roles",
        "method": "POST",
        "module": "ROLES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:12:51.974Z",
        "updatedAt": "2023-06-15T09:12:51.974Z",
        "__v": 0
    },
    {
        "_id": "648ad622dafdb9754f40b89f",
        "name": "Fetch roles with paginate",
        "apiPath": "/api/v1/roles",
        "method": "GET",
        "module": "ROLES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:13:06.618Z",
        "updatedAt": "2023-06-15T09:13:06.618Z",
        "__v": 0
    },
    {
        "_id": "648ad630dafdb9754f40b8a6",
        "name": "Fetch role by id",
        "apiPath": "/api/v1/roles/:id",
        "method": "GET",
        "module": "ROLES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:13:20.853Z",
        "updatedAt": "2023-06-15T09:13:20.853Z",
        "__v": 0
    },
    {
        "_id": "648ad640dafdb9754f40b8ab",
        "name": "Update Role",
        "apiPath": "/api/v1/roles/:id",
        "method": "PATCH",
        "module": "ROLES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:13:36.836Z",
        "updatedAt": "2023-06-15T09:13:36.836Z",
        "__v": 0
    },
    {
        "_id": "648ad650dafdb9754f40b8b0",
        "name": "Delete a Role",
        "apiPath": "/api/v1/roles/:id",
        "method": "DELETE",
        "module": "ROLES",
        "createdBy": {
            "_id": "647b5108a8a243e8191855b5",
            "email": "thanductrung@gmail.com"
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2023-06-15T09:13:52.798Z",
        "updatedAt": "2023-06-15T09:13:52.798Z",
        "__v": 0
    }
]

export const INIT_COMPANIES = [
    {
        name: "Google Việt Nam",
        address: "Tòa nhà CornerStone, 16 Phan Chu Trinh, Hoàn Kiếm, Hà Nội",
        description: "Văn phòng đại diện của Google tại Việt Nam, tập trung phát triển sản phẩm quảng cáo số, tìm kiếm và điện toán đám mây, đồng thời hỗ trợ hệ sinh thái nhà phát triển trong nước.",
        logo: "google-1686574998397.png",
    },
    {
        name: "Apple Việt Nam",
        address: "Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh",
        description: "Apple vận hành văn phòng kinh doanh và hỗ trợ khách hàng tại Việt Nam, đồng thời hợp tác với chuỗi đối tác bán lẻ ủy quyền (AAR) trên toàn quốc.",
        logo: "apple-1686574900663.jpg",
    },
    {
        name: "Amazon Web Services Việt Nam",
        address: "Bitexco Financial Tower, 2 Hải Triều, Quận 1, TP. Hồ Chí Minh",
        description: "AWS Việt Nam cung cấp dịch vụ điện toán đám mây, tư vấn chuyển đổi số và hỗ trợ kỹ thuật cho doanh nghiệp trong khu vực Đông Nam Á.",
        logo: "amzon-1686574798358.jpg",
    },
    {
        name: "Netflix Việt Nam",
        address: "Tòa nhà Saigon Centre, 65 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        description: "Netflix mở rộng hoạt động nội dung và kỹ thuật streaming tại Việt Nam, hợp tác với các studio sản xuất nội dung địa phương.",
        logo: "netflix-1686706116042.png",
    },
    {
        name: "Shopee Việt Nam",
        address: "Tòa nhà Saigon Centre, 65 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        description: "Shopee là nền tảng thương mại điện tử hàng đầu Đông Nam Á, văn phòng Việt Nam phụ trách vận hành, marketing và phát triển sản phẩm công nghệ.",
        logo: "shopee-1686575294231.png",
    },
    {
        name: "Tiki Corporation",
        address: "Tòa nhà Viettel, 285 Cách Mạng Tháng 8, Quận 10, TP. Hồ Chí Minh",
        description: "Tiki là sàn thương mại điện tử Việt Nam nổi bật với dịch vụ giao hàng nhanh TikiNOW, không ngừng đầu tư vào công nghệ và trải nghiệm khách hàng.",
        logo: "tiki-1686575455267.jpg",
    },
    {
        name: "TikTok Việt Nam",
        address: "Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội",
        description: "TikTok Việt Nam phát triển đội ngũ vận hành nội dung, kinh doanh quảng cáo và kỹ thuật phục vụ thị trường người dùng trẻ tại Việt Nam.",
        logo: "tiktok-1686575523674.jpg",
    },
    {
        name: "Lazada Việt Nam",
        address: "Tòa nhà Kim Anh, 23 Nguyễn Thị Huỳnh, Phú Nhuận, TP. Hồ Chí Minh",
        description: "Lazada Việt Nam thuộc tập đoàn Alibaba, vận hành nền tảng thương mại điện tử với hệ sinh thái logistics LEX và giải pháp thanh toán riêng.",
        logo: "lazada-1686575062887.png",
    },
    {
        name: "Tập đoàn Vingroup",
        address: "Số 7, Đường Bằng Lăng 1, Vinhomes Riverside, Long Biên, Hà Nội",
        description: "Vingroup là tập đoàn kinh tế đa ngành hàng đầu Việt Nam, hoạt động trong các lĩnh vực công nghệ, công nghiệp, bất động sản và bán lẻ.",
        logo: "vingroup-real.svg",
    },
];

export const INIT_JOB_SEEKERS = [
    { name: "Nguyễn Văn An", email: "annguyen.dev@gmail.com", age: 25, gender: "MALE", address: "Hà Nội" },
    { name: "Trần Thị Bình", email: "binhtran.hr@gmail.com", age: 23, gender: "FEMALE", address: "TP. Hồ Chí Minh" },
    { name: "Lê Minh Cường", email: "cuongle.backend@gmail.com", age: 28, gender: "MALE", address: "Đà Nẵng" },
    { name: "Phạm Thu Hà", email: "hapham.design@gmail.com", age: 24, gender: "FEMALE", address: "Hà Nội" },
    { name: "Hoàng Đức Duy", email: "duyhoang.qa@gmail.com", age: 26, gender: "MALE", address: "TP. Hồ Chí Minh" },
];

// startInDays: job posting start offset from "today" (when the seed runs)
// durationDays: how long the job stays open, counted from its own startDate
export const INIT_JOBS = [
    {
        companyName: "Google Việt Nam",
        name: "Frontend Engineer (React)",
        skills: ["REACT.JS", "TYPESCRIPT", "FRONTEND"],
        location: "HANOI",
        salary: 35000000,
        quantity: 2,
        level: "MIDDLE",
        description: "Xây dựng và tối ưu giao diện cho các sản phẩm quảng cáo của Google, làm việc cùng đội ngũ kỹ sư quốc tế, viết code TypeScript/React chuẩn hoá và có kiểm thử.",
        startInDays: -5,
        durationDays: 35,
        isActive: true,
    },
    {
        companyName: "Google Việt Nam",
        name: "Backend Engineer - Cloud Platform",
        skills: ["JAVA", "BACKEND"],
        location: "HANOI",
        salary: 45000000,
        quantity: 1,
        level: "SENIOR",
        description: "Thiết kế và vận hành hệ thống backend quy mô lớn cho nền tảng điện toán đám mây, tối ưu hiệu năng và độ tin cậy ở mức triệu request/ngày.",
        startInDays: -2,
        durationDays: 45,
        isActive: true,
    },
    {
        companyName: "Apple Việt Nam",
        name: "iOS Application Engineer",
        skills: ["REACT NATIVE", "FULLSTACK"],
        location: "HOCHIMINH",
        salary: 38000000,
        quantity: 1,
        level: "SENIOR",
        description: "Phát triển và bảo trì các ứng dụng di động phục vụ hệ sinh thái Apple tại thị trường Việt Nam, phối hợp chặt chẽ với đội ngũ sản phẩm toàn cầu.",
        startInDays: -10,
        durationDays: 30,
        isActive: true,
    },
    {
        companyName: "Apple Việt Nam",
        name: "Retail Business Manager",
        skills: ["BAN HANG", "TU VAN KHACH HANG"],
        location: "HOCHIMINH",
        salary: 25000000,
        quantity: 3,
        level: "MIDDLE",
        description: "Quản lý hoạt động kinh doanh tại các điểm bán lẻ ủy quyền, xây dựng quan hệ đối tác và đảm bảo trải nghiệm khách hàng theo tiêu chuẩn Apple.",
        startInDays: 0,
        durationDays: 30,
        isActive: true,
    },
    {
        companyName: "Amazon Web Services Việt Nam",
        name: "Cloud Solutions Architect",
        skills: ["JAVA", "BACKEND"],
        location: "HOCHIMINH",
        salary: 50000000,
        quantity: 1,
        level: "SENIOR",
        description: "Tư vấn kiến trúc giải pháp cloud cho khách hàng doanh nghiệp, thiết kế hệ thống migration lên AWS đảm bảo bảo mật và tối ưu chi phí.",
        startInDays: -7,
        durationDays: 40,
        isActive: true,
    },
    {
        companyName: "Amazon Web Services Việt Nam",
        name: "Customer Support Engineer - AWS",
        skills: ["BACKEND"],
        location: "HOCHIMINH",
        salary: 22000000,
        quantity: 2,
        level: "JUNIOR",
        description: "Hỗ trợ kỹ thuật cho khách hàng sử dụng dịch vụ AWS, xử lý sự cố hệ thống và phối hợp với đội ngũ kỹ thuật toàn cầu.",
        startInDays: -1,
        durationDays: 25,
        isActive: true,
    },
    {
        companyName: "Netflix Việt Nam",
        name: "Content Localization Specialist",
        skills: ["CONTENT MARKETING"],
        location: "HOCHIMINH",
        salary: 18000000,
        quantity: 2,
        level: "JUNIOR",
        description: "Biên dịch, hiệu đính phụ đề và bản địa hoá nội dung phim/series cho thị trường Việt Nam, đảm bảo chất lượng và văn phong tự nhiên.",
        startInDays: -3,
        durationDays: 20,
        isActive: true,
    },
    {
        companyName: "Netflix Việt Nam",
        name: "Backend Engineer - Streaming Platform",
        skills: ["JAVA", "BACKEND"],
        location: "HOCHIMINH",
        salary: 42000000,
        quantity: 1,
        level: "SENIOR",
        description: "Phát triển hệ thống backend phục vụ streaming quy mô lớn, tối ưu độ trễ và khả năng chịu tải cho hàng triệu người dùng đồng thời.",
        startInDays: -15,
        durationDays: 20,
        isActive: false,
    },
    {
        companyName: "Shopee Việt Nam",
        name: "Fullstack Developer (Nest.js/React)",
        skills: ["NEST.JS", "REACT.JS", "FULLSTACK"],
        location: "HOCHIMINH",
        salary: 28000000,
        quantity: 3,
        level: "MIDDLE",
        description: "Phát triển các tính năng thương mại điện tử end-to-end với Nest.js và React, tham gia toàn bộ vòng đời phát triển sản phẩm.",
        startInDays: -4,
        durationDays: 30,
        isActive: true,
    },
    {
        companyName: "Shopee Việt Nam",
        name: "Digital Marketing Executive",
        skills: ["DIGITAL MARKETING", "SEO"],
        location: "HOCHIMINH",
        salary: 16000000,
        quantity: 2,
        level: "FRESHER",
        description: "Lên kế hoạch và triển khai chiến dịch marketing số, tối ưu SEO và theo dõi hiệu quả các kênh quảng cáo trực tuyến.",
        startInDays: 0,
        durationDays: 30,
        isActive: true,
    },
    {
        companyName: "Tiki Corporation",
        name: "Backend Developer (Java Spring)",
        skills: ["JAVA", "BACKEND"],
        location: "HOCHIMINH",
        salary: 25000000,
        quantity: 2,
        level: "JUNIOR",
        description: "Xây dựng API phục vụ hệ thống thương mại điện tử Tiki, tối ưu truy vấn dữ liệu và đảm bảo hiệu năng hệ thống đơn hàng.",
        startInDays: -6,
        durationDays: 35,
        isActive: true,
    },
    {
        companyName: "Tiki Corporation",
        name: "Nhân viên Quản lý Kho hàng",
        skills: ["QUAN LY KHO", "CHUOI CUNG UNG"],
        location: "HOCHIMINH",
        salary: 14000000,
        quantity: 4,
        level: "FRESHER",
        description: "Quản lý hàng tồn kho, kiểm soát xuất nhập hàng hoá tại trung tâm phân loại TikiNOW, đảm bảo tiến độ giao hàng.",
        startInDays: -1,
        durationDays: 20,
        isActive: true,
    },
    {
        companyName: "TikTok Việt Nam",
        name: "Chuyên viên Kiểm duyệt Nội dung",
        skills: ["CONTENT MARKETING"],
        location: "HANOI",
        salary: 15000000,
        quantity: 5,
        level: "FRESHER",
        description: "Kiểm duyệt và phân loại nội dung video theo tiêu chuẩn cộng đồng, phối hợp với đội ngũ chính sách toàn cầu.",
        startInDays: -2,
        durationDays: 25,
        isActive: true,
    },
    {
        companyName: "TikTok Việt Nam",
        name: "Software Engineer - Ads Platform",
        skills: ["BACKEND", "TYPESCRIPT"],
        location: "HANOI",
        salary: 32000000,
        quantity: 2,
        level: "MIDDLE",
        description: "Phát triển nền tảng quảng cáo nội bộ, xây dựng công cụ đo lường hiệu quả chiến dịch cho khách hàng doanh nghiệp.",
        startInDays: -8,
        durationDays: 30,
        isActive: true,
    },
    {
        companyName: "Lazada Việt Nam",
        name: "QA/QC Engineer",
        skills: ["QC/QA"],
        location: "HOCHIMINH",
        salary: 20000000,
        quantity: 2,
        level: "JUNIOR",
        description: "Kiểm thử chức năng và hiệu năng cho nền tảng thương mại điện tử Lazada, xây dựng test case và tự động hoá kiểm thử.",
        startInDays: -3,
        durationDays: 30,
        isActive: true,
    },
    {
        companyName: "Lazada Việt Nam",
        name: "Frontend Developer (Vue.js)",
        skills: ["VUE.JS", "FRONTEND"],
        location: "HOCHIMINH",
        salary: 24000000,
        quantity: 2,
        level: "JUNIOR",
        description: "Phát triển giao diện người dùng cho ứng dụng bán hàng Lazada bằng Vue.js, phối hợp cùng đội thiết kế UI/UX.",
        startInDays: 0,
        durationDays: 30,
        isActive: true,
    },
    {
        companyName: "Tập đoàn Vingroup",
        name: "Kỹ sư Phần mềm - VinBigData",
        skills: ["JAVA", "BACKEND", "FULLSTACK"],
        location: "HANOI",
        salary: 30000000,
        quantity: 3,
        level: "MIDDLE",
        description: "Phát triển các sản phẩm dữ liệu lớn và AI ứng dụng cho hệ sinh thái Vingroup, làm việc trong môi trường nghiên cứu và sản xuất thực tế.",
        startInDays: -5,
        durationDays: 40,
        isActive: true,
    },
    {
        companyName: "Tập đoàn Vingroup",
        name: "Nhân viên Kinh doanh Bất động sản",
        skills: ["MOI GIOI BAT DONG SAN", "TU VAN KHACH HANG"],
        location: "HANOI",
        salary: 12000000,
        quantity: 10,
        level: "FRESHER",
        description: "Tư vấn và giới thiệu các dự án bất động sản Vinhomes tới khách hàng, chăm sóc khách hàng tiềm năng và chốt giao dịch.",
        startInDays: 0,
        durationDays: 45,
        isActive: true,
    },
];

export const INIT_SUBSCRIBERS = [
    { email: "annguyen.dev@gmail.com", name: "Nguyễn Văn An", skills: ["REACT.JS", "FRONTEND", "TYPESCRIPT"] },
    { email: "binhtran.hr@gmail.com", name: "Trần Thị Bình", skills: ["TUYEN DUNG", "C&B"] },
    { email: "cuongle.backend@gmail.com", name: "Lê Minh Cường", skills: ["JAVA", "BACKEND", "NEST.JS"] },
    { email: "hapham.design@gmail.com", name: "Phạm Thu Hà", skills: ["UI/UX DESIGN", "THIET KE DO HOA"] },
    { email: "duyhoang.qa@gmail.com", name: "Hoàng Đức Duy", skills: ["QC/QA"] },
];

// References existing sample CV files under back-end/public/images/resume
export const INIT_RESUMES = [
    {
        userEmail: "annguyen.dev@gmail.com",
        companyName: "Google Việt Nam",
        jobName: "Frontend Engineer (React)",
        status: "REVIEWING",
        url: "[PKA] CV intern frontend-1772421186834.pdf",
    },
    {
        userEmail: "annguyen.dev@gmail.com",
        companyName: "Shopee Việt Nam",
        jobName: "Fullstack Developer (Nest.js/React)",
        status: "PENDING",
        url: "[PKA] CV intern frontend-1772427502547.pdf",
    },
    {
        userEmail: "cuongle.backend@gmail.com",
        companyName: "Tiki Corporation",
        jobName: "Backend Developer (Java Spring)",
        status: "APPROVED",
        url: "[PKA] CV intern frontend-1772421186834.pdf",
    },
    {
        userEmail: "hapham.design@gmail.com",
        companyName: "Lazada Việt Nam",
        jobName: "Frontend Developer (Vue.js)",
        status: "REJECTED",
        url: "[PKA] CV intern frontend-1772427502547.pdf",
    },
];
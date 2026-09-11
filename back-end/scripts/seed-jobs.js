/**
 * Seed thêm 100 tin tuyển dụng vào collection `jobs`.
 *
 * Cách chạy:  npm run seed:jobs   (trong thư mục back-end)
 *
 * Vì sao là script rời chứ không thêm vào src/databases/sample.ts:
 * `DatabasesService` chỉ seed khi collection đang rỗng
 * (src/databases/databases.service.ts), nên trên DB đã có dữ liệu thì
 * sample.ts sẽ không bao giờ chạy lại.
 *
 * Script này idempotent: upsert theo cặp (name + company._id), nên chạy lại
 * nhiều lần sẽ cập nhật chứ không nhân đôi dữ liệu.
 *
 * Bộ skill dùng ở đây phải nằm trong CANONICAL_SKILLS
 * (src/cv-matching/cv-matching.constants.ts) — cũng chính là SKILLS_LIST của
 * frontend. Skill lệch khỏi danh sách đó sẽ không bao giờ khớp khi lọc job,
 * nên cuối script có bước tự kiểm tra.
 */
const path = require('path');
const fs = require('fs');
// Dùng mongoose (dependency trực tiếp của project) chứ không require('mongodb')
// — driver mongodb chỉ là dependency gián tiếp nên không nên phụ thuộc vào nó.
const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Nội dung mô tả
// ---------------------------------------------------------------------------

/** Quyền lợi khác nhau theo nhóm ngành — không dùng chung một khối cho tất cả. */
const BENEFITS = {
    tech: [
        'Lương thoả thuận theo năng lực, review 2 lần/năm.',
        'Thưởng theo hiệu suất dự án và thưởng cuối năm.',
        'Bảo hiểm sức khoẻ cao cấp cho bản thân và người thân.',
        'Làm việc hybrid, giờ giấc linh hoạt, cấp MacBook/thiết bị.',
        'Ngân sách đào tạo, chứng chỉ và hội thảo công nghệ hằng năm.',
    ],
    bank: [
        'Lương cứng cạnh tranh cộng thưởng KPI theo quý.',
        'Thu nhập 14-16 tháng/năm tuỳ kết quả kinh doanh.',
        'Bảo hiểm đầy đủ theo luật cộng bảo hiểm sức khoẻ nội bộ.',
        'Đào tạo nghiệp vụ chuyên sâu, lộ trình thăng tiến rõ ràng.',
        'Ưu đãi lãi suất và phí dịch vụ cho nhân viên.',
    ],
    retail: [
        'Lương cứng cộng hoa hồng, thu nhập không giới hạn.',
        'Phụ cấp ăn trưa, gửi xe, điện thoại.',
        'Đóng BHXH, BHYT, BHTN đầy đủ ngay khi ký hợp đồng.',
        'Thưởng lễ Tết, sinh nhật, du lịch team hằng năm.',
        'Được cấp đồng phục và đào tạo sản phẩm miễn phí.',
    ],
    factory: [
        'Lương cơ bản cộng phụ cấp ca, phụ cấp tay nghề.',
        'Xe đưa rước và cơm ca miễn phí.',
        'Đóng BHXH, BHYT, BHTN đầy đủ; khám sức khoẻ định kỳ.',
        'Thưởng năng suất theo tháng và thưởng cuối năm.',
        'Được đào tạo vận hành, an toàn lao động trước khi vào việc.',
    ],
    edu: [
        'Lương theo năng lực và bằng cấp, xét tăng lương hằng năm.',
        'Hỗ trợ học phí cho con em cán bộ nhân viên.',
        'Đóng BHXH đầy đủ, nghỉ hè theo quy định của trường.',
        'Được đào tạo chuyên môn và phương pháp giảng dạy thường xuyên.',
        'Môi trường làm việc thân thiện, cơ sở vật chất hiện đại.',
    ],
    health: [
        'Lương thoả thuận theo bằng cấp và kinh nghiệm.',
        'Phụ cấp trực, phụ cấp độc hại theo quy định.',
        'Bảo hiểm đầy đủ cộng bảo hiểm sức khoẻ cho nhân viên.',
        'Được hỗ trợ chi phí học chuyên khoa, cập nhật chứng chỉ hành nghề.',
        'Ưu đãi chi phí khám chữa bệnh cho nhân viên và gia đình.',
    ],
};

const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ul = (items) =>
    '<ul>' + items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ul>';

/** Dựng description dạng HTML giống các job đang có trong DB (react-quill). */
const buildDescription = (responsibilities, requirements, benefitsKey) =>
    '<p><strong>Mô tả công việc:</strong></p>' +
    ul(responsibilities) +
    '<p><strong>Yêu cầu ứng viên:</strong></p>' +
    ul(requirements) +
    '<p><strong>Quyền lợi:</strong></p>' +
    ul(BENEFITS[benefitsKey]);

// ---------------------------------------------------------------------------
// 100 tin tuyển dụng
// n=tên, c=công ty, s=skills, lv=level, loc=địa điểm, sal=lương, q=số lượng,
// r=mô tả công việc, rq=yêu cầu, b=nhóm quyền lợi
// ---------------------------------------------------------------------------
const JOBS = [
    // ===== IT / Công nghệ =====
    {
        n: 'Angular Developer', c: 'FPT Software', s: ['ANGULAR', 'TYPESCRIPT', 'FRONTEND'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 28000000, q: 3, b: 'tech',
        r: ['Phát triển và bảo trì các module giao diện cho dự án outsourcing thị trường Nhật, Mỹ bằng Angular 15+.',
            'Chuyển đổi thiết kế Figma thành component Angular tái sử dụng được.',
            'Tích hợp REST API, xử lý state bằng RxJS và NgRx.',
            'Tham gia code review, viết unit test với Jasmine/Karma.'],
        rq: ['2-4 năm kinh nghiệm Angular (ưu tiên Angular 12 trở lên) và TypeScript.',
            'Thành thạo RxJS, hiểu rõ change detection và lifecycle của Angular.',
            'Đọc hiểu tài liệu kỹ thuật tiếng Anh.',
            'Có kinh nghiệm làm việc với Git và quy trình Agile/Scrum.'],
    },
    {
        n: 'Senior Angular Engineer', c: 'Viettel', s: ['ANGULAR', 'TYPESCRIPT'],
        lv: 'SENIOR', loc: 'HANOI', sal: 45000000, q: 2, b: 'tech',
        r: ['Dẫn dắt kỹ thuật phần frontend cho hệ thống quản trị nội bộ quy mô hàng nghìn người dùng.',
            'Thiết kế kiến trúc module, xây dựng thư viện component dùng chung cho nhiều đội.',
            'Tối ưu hiệu năng bundle, lazy loading và thời gian tải trang.',
            'Kèm cặp (mentor) các bạn dev junior, đặt chuẩn code cho đội.'],
        rq: ['Từ 5 năm kinh nghiệm Angular, đã từng dẫn dắt kỹ thuật cho ít nhất một dự án lớn.',
            'Nắm vững thiết kế kiến trúc frontend, monorepo (Nx) là một lợi thế.',
            'Kinh nghiệm tối ưu hiệu năng và bảo mật phía client.',
            'Kỹ năng giao tiếp và trình bày giải pháp kỹ thuật tốt.'],
    },
    {
        n: 'Angular Developer (Fresher)', c: 'VNG Corporation', s: ['ANGULAR', 'FRONTEND'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 14000000, q: 5, b: 'tech',
        r: ['Tham gia phát triển giao diện cho các sản phẩm nội bộ dưới sự hướng dẫn của mentor.',
            'Sửa lỗi giao diện, viết component đơn giản theo thiết kế có sẵn.',
            'Học và áp dụng chuẩn code, quy trình review của đội.'],
        rq: ['Tốt nghiệp CNTT hoặc ngành liên quan, đã có project cá nhân dùng Angular hoặc framework tương tự.',
            'Hiểu cơ bản HTML, CSS, JavaScript và TypeScript.',
            'Chủ động học hỏi, tiếp nhận phản hồi tốt.'],
    },
    {
        n: 'ReactJS Developer', c: 'Tiki Corporation', s: ['REACT.JS', 'TYPESCRIPT', 'FRONTEND'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 22000000, q: 4, b: 'tech',
        r: ['Phát triển tính năng mới cho website thương mại điện tử Tiki với React và TypeScript.',
            'Phối hợp với đội backend và design để hoàn thiện luồng mua hàng.',
            'Đo và cải thiện các chỉ số Core Web Vitals của trang danh mục sản phẩm.'],
        rq: ['1-2 năm kinh nghiệm React.js, biết dùng hooks và context.',
            'Có kiến thức về Redux Toolkit hoặc thư viện quản lý state tương đương.',
            'Cẩn thận với chi tiết giao diện, biết dùng DevTools để debug.'],
    },
    {
        n: 'Senior Frontend Engineer (React)', c: 'Shopee Việt Nam', s: ['REACT.JS', 'TYPESCRIPT', 'FRONTEND'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 50000000, q: 2, b: 'tech',
        r: ['Chịu trách nhiệm kỹ thuật cho các trang có lưu lượng lớn trong mùa cao điểm sale.',
            'Thiết kế giải pháp render phía server (SSR) và chiến lược cache cho trang sản phẩm.',
            'Xây dựng hệ thống giám sát lỗi và hiệu năng frontend.',
            'Định hướng kỹ thuật và review code cho đội 6-8 người.'],
        rq: ['Từ 5 năm kinh nghiệm frontend, tối thiểu 3 năm với React ở sản phẩm quy mô lớn.',
            'Kinh nghiệm SSR (Next.js), tối ưu hiệu năng và xử lý tải cao.',
            'Hiểu sâu JavaScript engine, network và caching.',
            'Tiếng Anh làm việc tốt (đội ngũ đa quốc gia).'],
    },
    {
        n: 'Vue.js Developer', c: 'Lazada Việt Nam', s: ['VUE.JS', 'FRONTEND', 'TYPESCRIPT'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 27000000, q: 2, b: 'tech',
        r: ['Xây dựng và bảo trì hệ thống quản trị người bán (Seller Center) bằng Vue 3.',
            'Refactor các module cũ từ Options API sang Composition API.',
            'Tích hợp API và xử lý biểu đồ, báo cáo cho người bán.'],
        rq: ['2-4 năm kinh nghiệm Vue.js, đã làm việc với Vue 3 và Pinia/Vuex.',
            'Thành thạo TypeScript và công cụ build hiện đại (Vite).',
            'Có khả năng tự đọc yêu cầu và đề xuất giải pháp.'],
    },
    {
        n: 'NestJS Backend Developer', c: 'VNG Corporation', s: ['NEST.JS', 'BACKEND', 'TYPESCRIPT'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 30000000, q: 3, b: 'tech',
        r: ['Xây dựng REST API và microservice cho hệ thống game/nội dung số bằng NestJS.',
            'Thiết kế schema MongoDB/PostgreSQL và tối ưu truy vấn.',
            'Viết unit test, integration test và tài liệu API bằng Swagger.',
            'Tham gia xử lý sự cố production theo chế độ trực luân phiên.'],
        rq: ['2-4 năm kinh nghiệm Node.js, tối thiểu 1 năm với NestJS.',
            'Nắm vững TypeScript, dependency injection và kiến trúc module.',
            'Kinh nghiệm với Redis, message queue (Kafka/RabbitMQ) là lợi thế.',
            'Hiểu về Docker và CI/CD.'],
    },
    {
        n: 'Senior Backend Engineer (Node/Nest)', c: 'Grab Vietnam', s: ['NEST.JS', 'BACKEND'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 48000000, q: 2, b: 'tech',
        r: ['Thiết kế và triển khai các service chịu tải cao cho nền tảng gọi xe và giao đồ ăn.',
            'Đưa ra quyết định kiến trúc, đánh giá trade-off về hiệu năng và chi phí hạ tầng.',
            'Xây dựng chuẩn observability: logging, tracing, alerting.',
            'Mentor kỹ thuật cho các thành viên trong đội.'],
        rq: ['Từ 5 năm kinh nghiệm backend, thành thạo Node.js/NestJS.',
            'Đã làm việc với hệ thống phân tán, xử lý hàng nghìn request mỗi giây.',
            'Kinh nghiệm thiết kế API, database sharding và caching nhiều tầng.',
            'Tiếng Anh giao tiếp và viết tài liệu tốt.'],
    },
    {
        n: 'Java Backend Developer', c: 'Vietcombank', s: ['JAVA', 'BACKEND'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 32000000, q: 4, b: 'bank',
        r: ['Phát triển và bảo trì các service lõi của hệ thống ngân hàng số bằng Java Spring Boot.',
            'Tích hợp với hệ thống core banking và các đối tác thanh toán.',
            'Đảm bảo tuân thủ yêu cầu bảo mật và quy định của Ngân hàng Nhà nước.',
            'Viết tài liệu thiết kế và tham gia kiểm thử tích hợp.'],
        rq: ['2-4 năm kinh nghiệm Java, thành thạo Spring Boot và JPA/Hibernate.',
            'Kinh nghiệm với Oracle hoặc PostgreSQL, viết được truy vấn phức tạp.',
            'Hiểu về bảo mật ứng dụng, mã hoá và xác thực.',
            'Ưu tiên ứng viên đã làm trong lĩnh vực tài chính - ngân hàng.'],
    },
    {
        n: 'Senior Java Engineer', c: 'Techcombank', s: ['JAVA', 'BACKEND'],
        lv: 'SENIOR', loc: 'HANOI', sal: 46000000, q: 2, b: 'bank',
        r: ['Dẫn dắt thiết kế kỹ thuật cho các dự án chuyển đổi số trọng điểm của ngân hàng.',
            'Đánh giá và lựa chọn công nghệ, xây dựng chuẩn phát triển cho đội.',
            'Tối ưu hiệu năng hệ thống giao dịch và xử lý batch cuối ngày.',
            'Làm việc với kiểm toán nội bộ và bộ phận tuân thủ về mặt kỹ thuật.'],
        rq: ['Từ 5 năm kinh nghiệm Java, đã đảm nhiệm vai trò tech lead.',
            'Nắm vững kiến trúc microservice, Spring Cloud và Kubernetes.',
            'Kinh nghiệm xử lý giao dịch tài chính, đảm bảo tính nhất quán dữ liệu.',
            'Khả năng trình bày giải pháp cho cả đối tượng kỹ thuật và nghiệp vụ.'],
    },
    {
        n: 'Java Developer (Fresher)', c: 'FPT Software', s: ['JAVA', 'BACKEND'],
        lv: 'FRESHER', loc: 'DANANG', sal: 13000000, q: 8, b: 'tech',
        r: ['Tham gia các dự án phần mềm cho khách hàng nước ngoài với vai trò lập trình viên Java.',
            'Hiện thực các chức năng theo đặc tả, sửa lỗi theo phản hồi từ QA.',
            'Tham gia khoá đào tạo nội bộ 1-2 tháng trước khi vào dự án.'],
        rq: ['Tốt nghiệp CNTT, có kiến thức nền tảng về Java và OOP.',
            'Biết cơ bản về SQL và Spring Framework.',
            'Tiếng Anh đọc hiểu tài liệu; ưu tiên ứng viên có tiếng Nhật.'],
    },
    {
        n: 'Fullstack Developer (React + Nest)', c: 'Tiki Corporation', s: ['FULLSTACK', 'REACT.JS', 'NEST.JS'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 33000000, q: 3, b: 'tech',
        r: ['Phát triển tính năng xuyên suốt từ giao diện tới API cho hệ thống quản trị nội bộ.',
            'Tự thiết kế database, viết API và dựng giao diện quản trị tương ứng.',
            'Phối hợp với các bộ phận vận hành để làm rõ yêu cầu nghiệp vụ.'],
        rq: ['3-5 năm kinh nghiệm, làm được cả frontend (React) và backend (Node/NestJS).',
            'Thành thạo TypeScript ở cả hai phía.',
            'Có tư duy sản phẩm, biết cân đối giữa tốc độ và chất lượng.'],
    },
    {
        n: 'React Native Developer', c: 'Grab Vietnam', s: ['REACT NATIVE', 'FRONTEND'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 30000000, q: 2, b: 'tech',
        r: ['Phát triển tính năng cho ứng dụng di động dành cho đối tác tài xế.',
            'Xử lý các vấn đề đặc thù mobile: định vị nền, thông báo đẩy, tiết kiệm pin.',
            'Phối hợp với đội native iOS/Android khi cần viết module cầu nối.'],
        rq: ['2-4 năm kinh nghiệm React Native, đã đưa ứng dụng lên store.',
            'Hiểu về vòng đời ứng dụng, quản lý bộ nhớ và tối ưu hiệu năng mobile.',
            'Biết debug bằng Flipper/Xcode/Android Studio.'],
    },
    {
        n: 'React Native Engineer', c: 'Pharmacity', s: ['REACT NATIVE'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 21000000, q: 2, b: 'retail',
        r: ['Xây dựng và bảo trì ứng dụng khách hàng thân thiết của Pharmacity.',
            'Tích hợp thanh toán, tích điểm và mã giảm giá.',
            'Sửa lỗi theo phản hồi từ người dùng trên store.'],
        rq: ['1-2 năm kinh nghiệm React Native hoặc React.',
            'Biết làm việc với REST API và quản lý state.',
            'Có trách nhiệm, giao tiếp rõ ràng trong đội.'],
    },
    {
        n: 'Frontend Intern', c: 'VNG Corporation', s: ['FRONTEND', 'REACT.JS'],
        lv: 'INTERN', loc: 'HOCHIMINH', sal: 5000000, q: 6, b: 'tech',
        r: ['Tham gia dựng giao diện cho các trang tính năng nhỏ dưới hướng dẫn của mentor.',
            'Viết tài liệu và hỗ trợ kiểm thử giao diện.',
            'Tham gia các buổi tech sharing nội bộ hằng tuần.'],
        rq: ['Sinh viên năm 3, năm 4 ngành CNTT hoặc mới tốt nghiệp.',
            'Biết HTML, CSS, JavaScript; có tìm hiểu về React là lợi thế.',
            'Cam kết thực tập tối thiểu 3 tháng, 4 buổi/tuần.'],
    },
    {
        n: 'Backend Intern', c: 'Tiki Corporation', s: ['BACKEND', 'NEST.JS'],
        lv: 'INTERN', loc: 'HOCHIMINH', sal: 5000000, q: 5, b: 'tech',
        r: ['Hỗ trợ viết API cho các công cụ nội bộ.',
            'Viết script xử lý dữ liệu và tác vụ tự động hoá đơn giản.',
            'Học quy trình phát triển, kiểm thử và triển khai của đội.'],
        rq: ['Sinh viên năm cuối ngành CNTT.',
            'Có kiến thức cơ bản về JavaScript/TypeScript và cơ sở dữ liệu.',
            'Ham học, chủ động đặt câu hỏi.'],
    },
    {
        n: 'QA Engineer (Manual)', c: 'FPT Software', s: ['QC/QA'],
        lv: 'JUNIOR', loc: 'DANANG', sal: 16000000, q: 6, b: 'tech',
        r: ['Viết và thực thi test case cho các dự án phần mềm của khách hàng nước ngoài.',
            'Ghi nhận, phân loại và theo dõi lỗi trên Jira đến khi đóng.',
            'Tham gia kiểm thử hồi quy trước mỗi lần phát hành.'],
        rq: ['1-2 năm kinh nghiệm kiểm thử phần mềm thủ công.',
            'Biết viết test case rõ ràng, hiểu các loại kiểm thử cơ bản.',
            'Tiếng Anh đọc hiểu tài liệu đặc tả.'],
    },
    {
        n: 'QA Automation Engineer', c: 'Shopee Việt Nam', s: ['QC/QA', 'TYPESCRIPT'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 30000000, q: 3, b: 'tech',
        r: ['Xây dựng và bảo trì bộ kiểm thử tự động end-to-end bằng Playwright/Cypress.',
            'Tích hợp bộ test vào pipeline CI để chạy trên mỗi pull request.',
            'Phân tích kết quả test, khoanh vùng nguyên nhân lỗi cùng đội phát triển.'],
        rq: ['2-4 năm kinh nghiệm kiểm thử, tối thiểu 1 năm làm automation.',
            'Viết được code TypeScript/JavaScript ở mức tự xây dựng framework test.',
            'Hiểu về CI/CD và kiểm thử API.'],
    },
    {
        n: 'Senior QA Lead', c: 'Viettel', s: ['QC/QA'],
        lv: 'SENIOR', loc: 'HANOI', sal: 40000000, q: 1, b: 'tech',
        r: ['Xây dựng chiến lược và quy trình đảm bảo chất lượng cho khối sản phẩm số.',
            'Quản lý đội QA 8-10 người, phân bổ nguồn lực theo dự án.',
            'Thiết lập các chỉ số chất lượng và báo cáo định kỳ cho ban lãnh đạo.'],
        rq: ['Từ 5 năm kinh nghiệm QA, tối thiểu 2 năm ở vai trò quản lý đội.',
            'Nắm cả kiểm thử thủ công và tự động, hiểu về kiểm thử hiệu năng.',
            'Kỹ năng quản lý con người và giao tiếp với nhiều bên liên quan.'],
    },
    {
        n: 'Frontend Engineer', c: 'Google Việt Nam', s: ['FRONTEND', 'TYPESCRIPT'],
        lv: 'SENIOR', loc: 'HANOI', sal: 55000000, q: 1, b: 'tech',
        r: ['Phát triển giao diện cho các công cụ nội bộ phục vụ đội ngũ quảng cáo khu vực.',
            'Đề xuất và thực hiện cải tiến về khả năng truy cập (accessibility).',
            'Hợp tác với các nhóm kỹ sư tại nhiều quốc gia theo mô hình phân tán.'],
        rq: ['Từ 5 năm kinh nghiệm frontend với JavaScript/TypeScript.',
            'Hiểu sâu về trình duyệt, hiệu năng render và accessibility.',
            'Tiếng Anh thành thạo cả nói và viết.'],
    },
    {
        n: 'Backend Engineer (Java)', c: 'Amazon Web Services Việt Nam', s: ['JAVA', 'BACKEND'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 40000000, q: 3, b: 'tech',
        r: ['Phát triển service backend cho các công cụ hỗ trợ khách hàng doanh nghiệp.',
            'Thiết kế API và tích hợp với các dịch vụ hạ tầng đám mây.',
            'Tham gia thiết kế hệ thống và đánh giá thiết kế của đồng nghiệp.'],
        rq: ['3-5 năm kinh nghiệm Java, thành thạo Spring Boot.',
            'Có kinh nghiệm làm việc trên môi trường cloud (AWS là lợi thế lớn).',
            'Tiếng Anh giao tiếp tốt trong môi trường quốc tế.'],
    },
    {
        n: 'Mobile Developer (React Native)', c: 'TikTok Việt Nam', s: ['REACT NATIVE', 'FRONTEND'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 35000000, q: 2, b: 'tech',
        r: ['Phát triển các tính năng cho ứng dụng dành cho nhà sáng tạo nội dung.',
            'Tối ưu tốc độ khởi động và mức tiêu thụ tài nguyên của ứng dụng.',
            'Chạy A/B test và phân tích dữ liệu hành vi người dùng.'],
        rq: ['3-5 năm kinh nghiệm phát triển mobile, thành thạo React Native.',
            'Có kinh nghiệm với ứng dụng nhiều người dùng, xử lý video/media là lợi thế.',
            'Chủ động, chịu được nhịp làm việc nhanh.'],
    },
    {
        n: 'UI/UX Designer', c: 'Netflix Việt Nam', s: ['UI/UX DESIGN'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 30000000, q: 2, b: 'tech',
        r: ['Thiết kế luồng trải nghiệm và giao diện cho các tính năng khám phá nội dung.',
            'Dựng wireframe, prototype và bàn giao thiết kế cho đội kỹ thuật.',
            'Tham gia nghiên cứu người dùng và kiểm thử khả dụng.'],
        rq: ['3-5 năm kinh nghiệm thiết kế sản phẩm số, có portfolio rõ ràng.',
            'Thành thạo Figma, hiểu về design system và thiết kế đa nền tảng.',
            'Biết diễn giải quyết định thiết kế dựa trên dữ liệu.'],
    },
    {
        n: 'Senior UI/UX Designer', c: 'Tập đoàn Vingroup', s: ['UI/UX DESIGN', 'THIET KE DO HOA'],
        lv: 'SENIOR', loc: 'HANOI', sal: 38000000, q: 1, b: 'tech',
        r: ['Dẫn dắt thiết kế trải nghiệm cho hệ sinh thái ứng dụng của tập đoàn.',
            'Xây dựng và duy trì design system dùng chung cho nhiều sản phẩm.',
            'Phối hợp với các đơn vị thành viên để đảm bảo tính nhất quán thương hiệu.'],
        rq: ['Từ 5 năm kinh nghiệm UI/UX, đã từng xây dựng design system.',
            'Kỹ năng trình bày và thuyết phục các bên liên quan cấp cao.',
            'Tư duy hệ thống, chú trọng chi tiết.'],
    },
    {
        n: 'Fullstack Developer (Java + Angular)', c: 'Vietnam Airlines', s: ['FULLSTACK', 'JAVA', 'ANGULAR'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 31000000, q: 2, b: 'bank',
        r: ['Phát triển hệ thống quản lý lịch bay và nhân sự tổ bay.',
            'Xây dựng API bằng Spring Boot và giao diện quản trị bằng Angular.',
            'Tích hợp với hệ thống đặt chỗ và các hệ thống hàng không quốc tế.'],
        rq: ['3-5 năm kinh nghiệm làm được cả Java backend và Angular frontend.',
            'Hiểu về tích hợp hệ thống và xử lý dữ liệu lớn theo lô.',
            'Cẩn thận, tuân thủ quy trình trong môi trường nhiều quy định.'],
    },
    {
        n: 'Frontend Developer (Vue)', c: 'Vinamilk', s: ['VUE.JS', 'FRONTEND'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 20000000, q: 2, b: 'retail',
        r: ['Phát triển giao diện cho cổng thông tin nhà phân phối và trang thương mại điện tử.',
            'Chỉnh sửa giao diện theo yêu cầu của bộ phận marketing.',
            'Đảm bảo trang hiển thị tốt trên cả máy tính và điện thoại.'],
        rq: ['1-2 năm kinh nghiệm Vue.js hoặc framework frontend tương đương.',
            'Thành thạo HTML, CSS responsive.',
            'Biết phối hợp với designer và bộ phận nghiệp vụ.'],
    },
    {
        n: 'Backend Developer (Nest.js)', c: 'Vinschool', s: ['NEST.JS', 'BACKEND'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 22000000, q: 2, b: 'edu',
        r: ['Phát triển API cho hệ thống quản lý học sinh, điểm và liên lạc với phụ huynh.',
            'Xây dựng chức năng xuất báo cáo học tập theo kỳ.',
            'Hỗ trợ xử lý sự cố hệ thống trong giai đoạn đầu năm học.'],
        rq: ['1-2 năm kinh nghiệm Node.js, biết NestJS hoặc Express.',
            'Làm việc được với cơ sở dữ liệu quan hệ.',
            'Kiên nhẫn, sẵn sàng hỗ trợ người dùng không chuyên về kỹ thuật.'],
    },
    {
        n: 'QA Intern', c: 'VNG Corporation', s: ['QC/QA'],
        lv: 'INTERN', loc: 'HOCHIMINH', sal: 5000000, q: 4, b: 'tech',
        r: ['Thực thi test case theo hướng dẫn và ghi nhận lỗi.',
            'Hỗ trợ kiểm thử hồi quy trước các lần phát hành.',
            'Học cách viết test case và sử dụng công cụ quản lý lỗi.'],
        rq: ['Sinh viên năm 3, năm 4 các ngành CNTT hoặc liên quan.',
            'Tư duy logic, tỉ mỉ, thích tìm lỗi.',
            'Cam kết thực tập tối thiểu 3 tháng.'],
    },

    // ===== Kinh doanh / Marketing =====
    {
        n: 'Nhân viên Kinh doanh', c: 'Thế Giới Di Động', s: ['BAN HANG'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 12000000, q: 20, b: 'retail',
        r: ['Tư vấn và bán các sản phẩm điện thoại, laptop, phụ kiện tại cửa hàng.',
            'Giới thiệu chương trình khuyến mại, gói bảo hành mở rộng và trả góp.',
            'Sắp xếp, trưng bày hàng hoá và kiểm kê cuối ngày.'],
        rq: ['Tốt nghiệp THPT trở lên, không yêu cầu kinh nghiệm.',
            'Giao tiếp tốt, thái độ thân thiện với khách hàng.',
            'Chấp nhận làm theo ca, kể cả cuối tuần và ngày lễ.'],
    },
    {
        n: 'Trưởng nhóm Kinh doanh', c: 'Novaland', s: ['BAN HANG', 'TU VAN KHACH HANG'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 35000000, q: 3, b: 'retail',
        r: ['Quản lý và dẫn dắt nhóm 8-12 chuyên viên kinh doanh bất động sản.',
            'Xây dựng kế hoạch bán hàng theo từng dự án và theo dõi chỉ tiêu.',
            'Đào tạo kỹ năng tư vấn, chốt giao dịch cho nhân viên mới.',
            'Trực tiếp xử lý các giao dịch giá trị lớn và khách hàng quan trọng.'],
        rq: ['Từ 5 năm kinh nghiệm bán hàng, tối thiểu 2 năm quản lý đội nhóm.',
            'Đã làm trong lĩnh vực bất động sản hoặc tài chính là lợi thế lớn.',
            'Kỹ năng tạo động lực và quản lý chỉ tiêu.'],
    },
    {
        n: 'Chuyên viên Tư vấn Khách hàng', c: 'Vietcombank', s: ['TU VAN KHACH HANG'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 15000000, q: 10, b: 'bank',
        r: ['Tư vấn sản phẩm tiền gửi, thẻ và tín dụng cho khách hàng cá nhân tại quầy.',
            'Hướng dẫn khách hoàn thiện hồ sơ và theo dõi tiến độ xử lý.',
            'Chăm sóc khách hàng hiện hữu, khai thác nhu cầu mới.'],
        rq: ['1-2 năm kinh nghiệm ở vị trí tương đương, ưu tiên ngành tài chính - ngân hàng.',
            'Ngoại hình thiện cảm, giao tiếp và lắng nghe tốt.',
            'Cẩn thận với số liệu và quy trình hồ sơ.'],
    },
    {
        // Tên phải khác "Digital Marketing Executive" — Shopee đã có tin đó sẵn
        // trong sample.ts, trùng tên + công ty sẽ ghi đè mất tin gốc.
        n: 'Chuyên viên Digital Marketing Ngành hàng', c: 'Shopee Việt Nam',
        s: ['DIGITAL MARKETING', 'CHAY QUANG CAO'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 18000000, q: 4, b: 'retail',
        r: ['Lên kế hoạch và triển khai các chiến dịch marketing số cho ngành hàng được phân công.',
            'Thiết lập và tối ưu quảng cáo trên Facebook, Google và nội sàn.',
            'Theo dõi và báo cáo các chỉ số hiệu quả chiến dịch hằng tuần.'],
        rq: ['1-2 năm kinh nghiệm digital marketing, đã tự chạy quảng cáo.',
            'Biết dùng Google Analytics và các công cụ đo lường.',
            'Thoải mái với số liệu, biết dùng Excel/Google Sheets ở mức tốt.'],
    },
    {
        n: 'Digital Marketing Manager', c: 'Highlands Coffee', s: ['DIGITAL MARKETING', 'CONTENT MARKETING'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 40000000, q: 1, b: 'retail',
        r: ['Chịu trách nhiệm toàn bộ hoạt động marketing số của chuỗi trên cả nước.',
            'Quản lý ngân sách quảng cáo và làm việc với các agency đối tác.',
            'Dẫn dắt đội 5-7 người phụ trách nội dung, quảng cáo và mạng xã hội.',
            'Đo lường hiệu quả marketing lên lưu lượng khách tới cửa hàng.'],
        rq: ['Từ 5 năm kinh nghiệm marketing, tối thiểu 2 năm ở vị trí quản lý.',
            'Đã làm trong ngành F&B hoặc bán lẻ chuỗi là lợi thế.',
            'Tư duy thương hiệu kết hợp năng lực phân tích số liệu.'],
    },
    {
        n: 'Chuyên viên Chạy Quảng cáo (Ads)', c: 'Lazada Việt Nam', s: ['CHAY QUANG CAO', 'DIGITAL MARKETING'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 25000000, q: 3, b: 'retail',
        r: ['Quản lý ngân sách quảng cáo hằng tháng cho nhiều nhóm ngành hàng.',
            'Tối ưu chi phí trên mỗi đơn hàng và tỷ lệ hoàn vốn chi tiêu quảng cáo.',
            'Thử nghiệm định dạng và tệp khách hàng mới, tổng hợp bài học sau mỗi chiến dịch.'],
        rq: ['2-4 năm kinh nghiệm chạy quảng cáo Facebook, Google, TikTok.',
            'Từng quản lý ngân sách từ 200 triệu đồng/tháng trở lên.',
            'Nhạy số, biết đọc báo cáo và ra quyết định nhanh.'],
    },
    {
        n: 'Performance Marketing (Ads)', c: 'Tiki Corporation', s: ['CHAY QUANG CAO'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 17000000, q: 3, b: 'retail',
        r: ['Thiết lập và theo dõi các chiến dịch quảng cáo tìm kiếm và mua sắm.',
            'Chuẩn bị nội dung quảng cáo phối hợp cùng đội thiết kế.',
            'Làm báo cáo hiệu quả hằng ngày cho trưởng nhóm.'],
        rq: ['1-2 năm kinh nghiệm chạy quảng cáo trực tuyến.',
            'Có chứng chỉ Google Ads là lợi thế.',
            'Chăm chỉ, chịu áp lực chỉ tiêu.'],
    },
    {
        n: 'SEO Specialist', c: 'Pharmacity', s: ['SEO', 'CONTENT MARKETING'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 22000000, q: 2, b: 'retail',
        r: ['Xây dựng chiến lược SEO cho website bán thuốc và blog sức khoẻ.',
            'Nghiên cứu từ khoá, tối ưu on-page và cấu trúc website.',
            'Phối hợp với đội nội dung để sản xuất bài chuẩn SEO về chủ đề y tế.',
            'Theo dõi thứ hạng và lưu lượng tự nhiên hằng tháng.'],
        rq: ['2-4 năm kinh nghiệm SEO, đã đưa được từ khoá lên trang nhất.',
            'Thành thạo Ahrefs/SEMrush, Google Search Console.',
            'Hiểu về SEO kỹ thuật: tốc độ tải, dữ liệu có cấu trúc.'],
    },
    {
        n: 'Content Marketing Executive', c: 'TikTok Việt Nam', s: ['CONTENT MARKETING'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 17000000, q: 4, b: 'tech',
        r: ['Sản xuất nội dung hướng dẫn và truyền thông cho cộng đồng nhà sáng tạo.',
            'Viết kịch bản video ngắn và bài đăng cho các kênh chính thức.',
            'Theo dõi xu hướng nội dung và đề xuất chủ đề mới hằng tuần.'],
        rq: ['1-2 năm kinh nghiệm sáng tạo nội dung số.',
            'Viết tiếng Việt tốt, nắm bắt nhanh xu hướng mạng xã hội.',
            'Biết dựng video cơ bản là lợi thế.'],
    },
    {
        n: 'Nhân viên Telesales', c: 'Techcombank', s: ['TELESALES', 'TU VAN KHACH HANG'],
        lv: 'FRESHER', loc: 'HANOI', sal: 11000000, q: 25, b: 'bank',
        r: ['Gọi điện tư vấn sản phẩm thẻ tín dụng và vay tiêu dùng theo danh sách được cấp.',
            'Ghi nhận thông tin khách hàng và chuyển hồ sơ cho bộ phận xử lý.',
            'Đạt chỉ tiêu số cuộc gọi và số hồ sơ theo tháng.'],
        rq: ['Tốt nghiệp trung cấp trở lên, không yêu cầu kinh nghiệm.',
            'Giọng nói rõ ràng, dễ nghe; kiên trì khi bị từ chối.',
            'Được đào tạo nghiệp vụ miễn phí trong 2 tuần đầu.'],
    },
    {
        n: 'Telesales Bất động sản', c: 'Novaland', s: ['TELESALES', 'MOI GIOI BAT DONG SAN'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 12000000, q: 15, b: 'retail',
        r: ['Gọi điện giới thiệu các dự án căn hộ và nhà phố tới khách hàng tiềm năng.',
            'Sàng lọc nhu cầu và hẹn khách tham quan nhà mẫu.',
            'Cập nhật thông tin khách vào hệ thống quản lý bán hàng.'],
        rq: ['Không yêu cầu kinh nghiệm, được đào tạo về sản phẩm.',
            'Giao tiếp tự tin qua điện thoại, chịu được áp lực chỉ tiêu.',
            'Mong muốn thu nhập cao từ hoa hồng.'],
    },
    {
        n: 'Telesales Leader', c: 'Pharmacity', s: ['TELESALES'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 20000000, q: 3, b: 'retail',
        r: ['Quản lý nhóm 10-15 nhân viên telesales, theo dõi chỉ tiêu hằng ngày.',
            'Xây dựng kịch bản gọi và tài liệu đào tạo cho nhân viên mới.',
            'Nghe lại cuộc gọi để đánh giá chất lượng và phản hồi cho nhân viên.'],
        rq: ['2-4 năm kinh nghiệm telesales, tối thiểu 1 năm quản lý nhóm.',
            'Kỹ năng đào tạo và tạo động lực cho đội.',
            'Biết dùng công cụ quản lý khách hàng và báo cáo.'],
    },

    // ===== Kế toán / Tài chính =====
    {
        n: 'Kế toán Tổng hợp', c: 'Vinamilk', s: ['KE TOAN TONG HOP'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 20000000, q: 2, b: 'retail',
        r: ['Tổng hợp số liệu và lập báo cáo tài chính tháng, quý, năm.',
            'Kiểm tra và hạch toán các nghiệp vụ mua bán, chi phí, tài sản cố định.',
            'Đối chiếu công nợ với nhà phân phối và nhà cung cấp.',
            'Làm việc với kiểm toán độc lập trong kỳ kiểm toán.'],
        rq: ['3-5 năm kinh nghiệm kế toán tổng hợp tại doanh nghiệp sản xuất.',
            'Nắm vững chế độ kế toán Việt Nam và các quy định về thuế.',
            'Thành thạo Excel và phần mềm kế toán (SAP là lợi thế).'],
    },
    {
        n: 'Kế toán Tổng hợp', c: 'Highlands Coffee', s: ['KE TOAN TONG HOP'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 15000000, q: 3, b: 'retail',
        r: ['Hạch toán doanh thu và chi phí của các cửa hàng trong khu vực phụ trách.',
            'Kiểm tra chứng từ, hoá đơn từ cửa hàng gửi về.',
            'Hỗ trợ lập báo cáo nội bộ hằng tháng.'],
        rq: ['1-2 năm kinh nghiệm kế toán, ưu tiên ngành F&B hoặc bán lẻ.',
            'Tốt nghiệp đại học chuyên ngành kế toán, kiểm toán.',
            'Cẩn thận, chịu được khối lượng chứng từ lớn.'],
    },
    {
        n: 'Kế toán Thuế', c: 'Thế Giới Di Động', s: ['KE TOAN THUE', 'KE TOAN TONG HOP'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 19000000, q: 2, b: 'retail',
        r: ['Lập và nộp các báo cáo thuế giá trị gia tăng, thu nhập doanh nghiệp, thu nhập cá nhân.',
            'Rà soát hoá đơn đầu vào, đầu ra và xử lý hoá đơn sai sót.',
            'Làm việc trực tiếp với cơ quan thuế khi có thanh tra, kiểm tra.',
            'Cập nhật và phổ biến các thay đổi về chính sách thuế cho bộ phận liên quan.'],
        rq: ['2-4 năm kinh nghiệm kế toán thuế tại doanh nghiệp quy mô lớn.',
            'Nắm vững Luật Thuế và các thông tư hướng dẫn hiện hành.',
            'Có kinh nghiệm làm việc với cơ quan thuế là lợi thế.'],
    },
    {
        n: 'Chuyên viên Kế toán Thuế', c: 'VinFast', s: ['KE TOAN THUE'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 16000000, q: 3, b: 'factory',
        r: ['Chuẩn bị hồ sơ khai thuế hằng tháng, hằng quý theo hướng dẫn.',
            'Kiểm tra tính hợp lệ của hoá đơn, chứng từ đầu vào.',
            'Theo dõi hoàn thuế cho hoạt động xuất khẩu.'],
        rq: ['1-2 năm kinh nghiệm kế toán, có tìm hiểu về nghiệp vụ thuế.',
            'Tốt nghiệp đại học chuyên ngành kế toán, tài chính.',
            'Tỉ mỉ, có tinh thần tuân thủ quy định.'],
    },
    {
        n: 'Chuyên viên Phân tích Tài chính', c: 'Vietcombank', s: ['PHAN TICH TAI CHINH'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 28000000, q: 3, b: 'bank',
        r: ['Phân tích báo cáo tài chính của doanh nghiệp phục vụ thẩm định tín dụng.',
            'Xây dựng mô hình dự báo dòng tiền và đánh giá khả năng trả nợ.',
            'Lập báo cáo đề xuất trình hội đồng tín dụng.'],
        rq: ['2-4 năm kinh nghiệm phân tích tài chính hoặc thẩm định tín dụng.',
            'Đọc hiểu và phân tích thành thạo báo cáo tài chính doanh nghiệp.',
            'Thành thạo Excel; có CFA hoặc ACCA là lợi thế lớn.'],
    },
    {
        n: 'Senior Financial Analyst', c: 'Tập đoàn Vingroup', s: ['PHAN TICH TAI CHINH'],
        lv: 'SENIOR', loc: 'HANOI', sal: 42000000, q: 2, b: 'bank',
        r: ['Phân tích hiệu quả đầu tư của các dự án trong hệ sinh thái tập đoàn.',
            'Xây dựng mô hình định giá và đánh giá phương án huy động vốn.',
            'Trình bày kết quả phân tích trực tiếp cho ban lãnh đạo.',
            'Hướng dẫn nghiệp vụ cho các chuyên viên phân tích cấp dưới.'],
        rq: ['Từ 5 năm kinh nghiệm phân tích tài chính hoặc đầu tư.',
            'Kinh nghiệm định giá doanh nghiệp và mô hình hoá tài chính phức tạp.',
            'Có CFA là lợi thế rất lớn; tiếng Anh thành thạo.'],
    },
    {
        n: 'Kiểm toán Nội bộ', c: 'Techcombank', s: ['KIEM TOAN'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 26000000, q: 3, b: 'bank',
        r: ['Thực hiện các cuộc kiểm toán nội bộ theo kế hoạch năm.',
            'Đánh giá tính hiệu quả của hệ thống kiểm soát nội bộ tại các chi nhánh.',
            'Lập báo cáo phát hiện và theo dõi việc khắc phục của đơn vị được kiểm toán.'],
        rq: ['2-4 năm kinh nghiệm kiểm toán, ưu tiên từ Big4 hoặc kiểm toán nội bộ ngân hàng.',
            'Hiểu về quản trị rủi ro và tuân thủ trong lĩnh vực ngân hàng.',
            'Kỹ năng viết báo cáo và trao đổi với đơn vị được kiểm toán.'],
    },
    {
        n: 'Kiểm toán Nội bộ', c: 'Vietnam Airlines', s: ['KIEM TOAN', 'PHAN TICH TAI CHINH'],
        lv: 'SENIOR', loc: 'HANOI', sal: 38000000, q: 1, b: 'bank',
        r: ['Chủ trì các cuộc kiểm toán về chi phí khai thác và mua sắm.',
            'Xây dựng kế hoạch kiểm toán dựa trên đánh giá rủi ro.',
            'Tư vấn cải tiến quy trình cho các đơn vị nghiệp vụ.'],
        rq: ['Từ 5 năm kinh nghiệm kiểm toán, đã chủ trì các cuộc kiểm toán độc lập.',
            'Có chứng chỉ CPA, ACCA hoặc CIA.',
            'Tính độc lập, khách quan và khả năng làm việc với nhiều cấp quản lý.'],
    },

    // ===== Nhân sự / Hành chính =====
    {
        n: 'Chuyên viên Tuyển dụng', c: 'FPT Software', s: ['TUYEN DUNG'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 15000000, q: 5, b: 'tech',
        r: ['Tuyển dụng các vị trí lập trình viên và kiểm thử theo yêu cầu của dự án.',
            'Tìm kiếm ứng viên qua các kênh trực tuyến và mạng lưới giới thiệu.',
            'Sàng lọc hồ sơ, phỏng vấn sơ bộ và điều phối lịch phỏng vấn kỹ thuật.',
            'Theo dõi và báo cáo tiến độ tuyển dụng hằng tuần.'],
        rq: ['1-2 năm kinh nghiệm tuyển dụng, ưu tiên tuyển dụng ngành IT.',
            'Biết cách tiếp cận và thuyết phục ứng viên.',
            'Tiếng Anh đọc hiểu hồ sơ ứng viên.'],
    },
    {
        n: 'Talent Acquisition Lead', c: 'VNG Corporation', s: ['TUYEN DUNG'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 35000000, q: 1, b: 'tech',
        r: ['Xây dựng chiến lược thu hút nhân tài cho khối kỹ thuật và sản phẩm.',
            'Quản lý đội tuyển dụng 4-6 người và các chỉ tiêu tuyển dụng của công ty.',
            'Phát triển thương hiệu nhà tuyển dụng qua các sự kiện và kênh truyền thông.',
            'Làm việc với ban lãnh đạo để dự báo nhu cầu nhân sự.'],
        rq: ['Từ 5 năm kinh nghiệm tuyển dụng, tối thiểu 2 năm quản lý đội.',
            'Kinh nghiệm tuyển các vị trí kỹ thuật cấp cao.',
            'Tư duy dữ liệu trong quản lý hiệu quả tuyển dụng.'],
    },
    {
        n: 'Chuyên viên C&B', c: 'Viettel', s: ['C&B'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 22000000, q: 2, b: 'bank',
        r: ['Tính lương, thưởng và các khoản phụ cấp cho khối nhân sự được phân công.',
            'Thực hiện thủ tục bảo hiểm xã hội, bảo hiểm y tế và quyết toán thuế thu nhập cá nhân.',
            'Rà soát và cập nhật chính sách phúc lợi theo quy định mới.',
            'Giải đáp thắc mắc của nhân viên về lương và chế độ.'],
        rq: ['2-4 năm kinh nghiệm C&B tại doanh nghiệp từ 500 nhân sự.',
            'Nắm vững Luật Lao động, Luật Bảo hiểm xã hội và thuế thu nhập cá nhân.',
            'Thành thạo Excel; cẩn thận và bảo mật thông tin.'],
    },
    {
        n: 'Chuyên viên C&B', c: 'Grab Vietnam', s: ['C&B', 'HANH CHINH VAN PHONG'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 17000000, q: 2, b: 'tech',
        r: ['Hỗ trợ tính lương và quản lý dữ liệu nhân sự trên hệ thống.',
            'Theo dõi ngày phép, chấm công và hợp đồng lao động.',
            'Hỗ trợ các thủ tục hành chính cho nhân viên mới và nhân viên nghỉ việc.'],
        rq: ['1-2 năm kinh nghiệm nhân sự tổng hợp hoặc C&B.',
            'Biết dùng phần mềm quản lý nhân sự.',
            'Tỉ mỉ, giữ được tính bảo mật của dữ liệu.'],
    },
    {
        n: 'Chuyên viên Đào tạo Nội bộ', c: 'Highlands Coffee', s: ['DAO TAO NOI BO'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 20000000, q: 2, b: 'retail',
        r: ['Thiết kế và triển khai chương trình đào tạo cho nhân viên cửa hàng toàn quốc.',
            'Trực tiếp đứng lớp các khoá về dịch vụ khách hàng và quy trình vận hành.',
            'Đánh giá hiệu quả đào tạo và cải tiến tài liệu.',
            'Đào tạo đội ngũ quản lý cửa hàng làm giảng viên nội bộ.'],
        rq: ['2-4 năm kinh nghiệm đào tạo, ưu tiên ngành F&B hoặc bán lẻ.',
            'Kỹ năng đứng lớp và thiết kế tài liệu đào tạo.',
            'Sẵn sàng đi công tác tới các tỉnh.'],
    },
    {
        n: 'Chuyên viên Đào tạo', c: 'Vinschool', s: ['DAO TAO NOI BO', 'GIANG DAY'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 21000000, q: 2, b: 'edu',
        r: ['Tổ chức các khoá bồi dưỡng chuyên môn và phương pháp giảng dạy cho giáo viên.',
            'Xây dựng lộ trình phát triển nghề nghiệp cho đội ngũ giáo viên.',
            'Theo dõi và đánh giá chất lượng giảng dạy sau đào tạo.'],
        rq: ['2-4 năm kinh nghiệm đào tạo trong lĩnh vực giáo dục.',
            'Có nền tảng về sư phạm và phương pháp giảng dạy hiện đại.',
            'Kỹ năng tổ chức và điều phối tốt.'],
    },
    {
        n: 'Nhân viên Hành chính Văn phòng', c: 'Novaland', s: ['HANH CHINH VAN PHONG'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 11000000, q: 4, b: 'retail',
        r: ['Quản lý văn phòng phẩm, thiết bị và các hợp đồng dịch vụ văn phòng.',
            'Tiếp nhận, phân loại và lưu trữ công văn, hồ sơ.',
            'Hỗ trợ tổ chức họp, sự kiện nội bộ và đặt vé, khách sạn công tác.'],
        rq: ['Tốt nghiệp đại học, cao đẳng; không yêu cầu kinh nghiệm.',
            'Sử dụng tốt tin học văn phòng.',
            'Cẩn thận, gọn gàng, có tinh thần phục vụ.'],
    },
    {
        n: 'Trợ lý Hành chính', c: 'Vietnam Airlines', s: ['HANH CHINH VAN PHONG'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 14000000, q: 3, b: 'bank',
        r: ['Hỗ trợ lịch làm việc và tài liệu cho ban giám đốc khối.',
            'Soạn thảo văn bản, biên bản họp và theo dõi công việc được giao.',
            'Điều phối các thủ tục hành chính giữa các phòng ban.'],
        rq: ['1-2 năm kinh nghiệm hành chính hoặc trợ lý.',
            'Soạn thảo văn bản tốt, tiếng Anh giao tiếp cơ bản.',
            'Kín kẽ, biết sắp xếp ưu tiên công việc.'],
    },

    // ===== Vận hành / Logistics =====
    {
        n: 'Quản lý Kho', c: 'Lazada Việt Nam', s: ['QUAN LY KHO'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 20000000, q: 4, b: 'factory',
        r: ['Quản lý hoạt động nhập, xuất và tồn kho tại trung tâm phân loại.',
            'Điều phối nhân sự theo ca để đảm bảo tiến độ xử lý đơn hàng.',
            'Kiểm soát độ chính xác tồn kho và xử lý chênh lệch sau kiểm kê.',
            'Đề xuất cải tiến sơ đồ kho và luồng hàng hoá.'],
        rq: ['2-4 năm kinh nghiệm quản lý kho, ưu tiên kho thương mại điện tử.',
            'Sử dụng thành thạo hệ thống quản lý kho (WMS).',
            'Quản lý được đội 20-40 nhân sự; chấp nhận làm theo ca.'],
    },
    {
        n: 'Nhân viên Kho', c: 'Thế Giới Di Động', s: ['QUAN LY KHO'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 10000000, q: 15, b: 'factory',
        r: ['Nhận hàng, kiểm đếm và sắp xếp hàng hoá theo đúng vị trí.',
            'Soạn hàng theo đơn và chuẩn bị hàng chuyển tới cửa hàng.',
            'Tham gia kiểm kê định kỳ và giữ gìn vệ sinh khu vực kho.'],
        rq: ['Tốt nghiệp THPT trở lên, không yêu cầu kinh nghiệm.',
            'Sức khoẻ tốt, chịu được công việc cần đi lại và bê hàng.',
            'Trung thực, cẩn thận trong kiểm đếm.'],
    },
    {
        n: 'Điều phối Vận tải', c: 'Grab Vietnam', s: ['DIEU PHOI VAN TAI'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 15000000, q: 6, b: 'retail',
        r: ['Theo dõi và điều phối đội xe giao hàng theo khu vực trong ngày.',
            'Xử lý các tình huống phát sinh: xe hỏng, giao trễ, khách đổi địa chỉ.',
            'Báo cáo các chỉ số giao hàng đúng hạn cho trưởng bộ phận.'],
        rq: ['1-2 năm kinh nghiệm điều phối vận tải hoặc giao nhận.',
            'Xử lý tình huống nhanh, giao tiếp tốt qua điện thoại.',
            'Sẵn sàng làm theo ca, kể cả cuối tuần.'],
    },
    {
        n: 'Chuyên viên Điều phối Vận tải', c: 'Viettel', s: ['DIEU PHOI VAN TAI', 'CHUOI CUNG UNG'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 21000000, q: 3, b: 'factory',
        r: ['Lập kế hoạch tuyến vận chuyển hàng hoá giữa các kho khu vực.',
            'Làm việc với nhà vận tải đối tác về giá và chất lượng dịch vụ.',
            'Phân tích chi phí vận tải và đề xuất phương án tối ưu.'],
        rq: ['2-4 năm kinh nghiệm điều phối hoặc kế hoạch vận tải.',
            'Biết phân tích dữ liệu vận hành bằng Excel.',
            'Có kinh nghiệm làm việc với nhà vận tải bên thứ ba.'],
    },
    {
        n: 'Chuyên viên Xuất Nhập khẩu', c: 'Vinamilk', s: ['XUAT NHAP KHAU'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 22000000, q: 2, b: 'factory',
        r: ['Thực hiện thủ tục hải quan cho các lô hàng nguyên liệu nhập khẩu và sữa xuất khẩu.',
            'Chuẩn bị và kiểm tra bộ chứng từ: hợp đồng, hoá đơn, vận đơn, C/O.',
            'Làm việc với hãng tàu, đại lý giao nhận và cơ quan hải quan.',
            'Theo dõi tiến độ lô hàng và xử lý vướng mắc thông quan.'],
        rq: ['2-4 năm kinh nghiệm xuất nhập khẩu, đã trực tiếp làm thủ tục hải quan.',
            'Nắm vững quy định về thuế xuất nhập khẩu, HS code và các FTA.',
            'Tiếng Anh đọc hiểu và soạn thảo chứng từ tốt.'],
    },
    {
        n: 'Nhân viên Xuất Nhập khẩu', c: 'VinFast', s: ['XUAT NHAP KHAU', 'CHUOI CUNG UNG'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 17000000, q: 4, b: 'factory',
        r: ['Chuẩn bị chứng từ nhập khẩu linh kiện và phụ tùng cho nhà máy.',
            'Theo dõi lịch tàu, lịch giao hàng và cập nhật cho bộ phận sản xuất.',
            'Lưu trữ và quản lý hồ sơ xuất nhập khẩu theo quy định.'],
        rq: ['1-2 năm kinh nghiệm xuất nhập khẩu hoặc logistics.',
            'Tốt nghiệp ngành ngoại thương, logistics hoặc liên quan.',
            'Tiếng Anh đọc hiểu chứng từ; cẩn thận với giấy tờ.'],
    },
    {
        n: 'Trưởng bộ phận Xuất Nhập khẩu', c: 'Vietnam Airlines', s: ['XUAT NHAP KHAU'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 33000000, q: 1, b: 'bank',
        r: ['Quản lý toàn bộ hoạt động xuất nhập khẩu vật tư, phụ tùng máy bay.',
            'Đàm phán hợp đồng với các nhà cung cấp và đơn vị giao nhận quốc tế.',
            'Đảm bảo tuân thủ quy định hải quan và các công ước hàng không.',
            'Quản lý đội 5-8 chuyên viên.'],
        rq: ['Từ 5 năm kinh nghiệm xuất nhập khẩu, tối thiểu 2 năm quản lý.',
            'Hiểu sâu về vận tải hàng không và thủ tục hải quan hàng đặc thù.',
            'Tiếng Anh thành thạo; kỹ năng đàm phán tốt.'],
    },
    {
        n: 'Chuyên viên Chuỗi Cung ứng', c: 'Shopee Việt Nam', s: ['CHUOI CUNG UNG'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 26000000, q: 3, b: 'tech',
        r: ['Phân tích và dự báo nhu cầu hàng hoá cho các kho khu vực.',
            'Phối hợp giữa đội thu mua, kho và vận chuyển để đảm bảo mức tồn kho hợp lý.',
            'Xây dựng báo cáo theo dõi hiệu quả chuỗi cung ứng.',
            'Đề xuất cải tiến quy trình để giảm thời gian giao hàng.'],
        rq: ['2-4 năm kinh nghiệm chuỗi cung ứng hoặc kế hoạch.',
            'Kỹ năng phân tích dữ liệu tốt (Excel nâng cao, SQL là lợi thế).',
            'Tư duy hệ thống, khả năng làm việc liên bộ phận.'],
    },

    // ===== Sản xuất / Kỹ thuật =====
    {
        n: 'Nhân viên Vận hành Máy', c: 'VinFast', s: ['VAN HANH MAY'],
        lv: 'FRESHER', loc: 'HANOI', sal: 11000000, q: 30, b: 'factory',
        r: ['Vận hành máy móc, thiết bị trên dây chuyền lắp ráp theo hướng dẫn công việc.',
            'Kiểm tra thông số vận hành và ghi chép biểu mẫu sản xuất.',
            'Thực hiện bảo dưỡng cấp một và giữ gìn vệ sinh khu vực làm việc.',
            'Báo cáo ngay các bất thường của thiết bị cho tổ trưởng.'],
        rq: ['Tốt nghiệp THPT hoặc trung cấp kỹ thuật.',
            'Không yêu cầu kinh nghiệm, được đào tạo trước khi vào dây chuyền.',
            'Chấp nhận làm theo ca; tuân thủ nghiêm quy định an toàn.'],
    },
    {
        n: 'Kỹ thuật viên Vận hành Máy', c: 'Vinamilk', s: ['VAN HANH MAY', 'BAO TRI THIET BI'],
        lv: 'JUNIOR', loc: 'OTHER', sal: 14000000, q: 10, b: 'factory',
        r: ['Vận hành dây chuyền chiết rót và đóng gói sữa tự động.',
            'Cài đặt thông số máy khi chuyển đổi quy cách sản phẩm.',
            'Xử lý sự cố dừng máy đơn giản và phối hợp với đội bảo trì.'],
        rq: ['1-2 năm kinh nghiệm vận hành máy trong nhà máy thực phẩm hoặc tương đương.',
            'Tốt nghiệp trung cấp, cao đẳng ngành cơ khí, điện, tự động hoá.',
            'Hiểu về vệ sinh an toàn thực phẩm trong sản xuất.'],
    },
    {
        n: 'Nhân viên Bảo trì Thiết bị', c: 'VinFast', s: ['BAO TRI THIET BI'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 15000000, q: 8, b: 'factory',
        r: ['Thực hiện bảo trì phòng ngừa theo kế hoạch cho máy móc trong xưởng.',
            'Sửa chữa, thay thế các chi tiết cơ khí, điện khi thiết bị gặp sự cố.',
            'Ghi nhận lịch sử bảo trì và tình trạng thiết bị vào hệ thống.'],
        rq: ['1-2 năm kinh nghiệm bảo trì thiết bị công nghiệp.',
            'Tốt nghiệp trung cấp, cao đẳng ngành cơ khí, điện, cơ điện tử.',
            'Đọc được sơ đồ điện, bản vẽ cơ khí cơ bản.'],
    },
    {
        n: 'Trưởng nhóm Bảo trì', c: 'Vinamilk', s: ['BAO TRI THIET BI', 'AN TOAN LAO DONG'],
        lv: 'SENIOR', loc: 'OTHER', sal: 28000000, q: 2, b: 'factory',
        r: ['Quản lý đội bảo trì và lập kế hoạch bảo dưỡng toàn nhà máy.',
            'Phân tích nguyên nhân gốc rễ các sự cố dừng máy và đề xuất biện pháp phòng ngừa.',
            'Quản lý vật tư, phụ tùng thay thế và ngân sách bảo trì.',
            'Đảm bảo tuân thủ quy định an toàn trong mọi hoạt động bảo trì.'],
        rq: ['Từ 5 năm kinh nghiệm bảo trì, tối thiểu 2 năm quản lý đội.',
            'Tốt nghiệp đại học ngành cơ khí, điện hoặc tự động hoá.',
            'Nắm được phương pháp bảo trì phòng ngừa và quản lý an toàn.'],
    },
    {
        n: 'Nhân viên QC Sản xuất', c: 'Vinamilk', s: ['QC/QA'],
        lv: 'JUNIOR', loc: 'OTHER', sal: 14000000, q: 6, b: 'factory',
        r: ['Lấy mẫu và kiểm tra chất lượng nguyên liệu, bán thành phẩm và thành phẩm.',
            'Ghi nhận kết quả kiểm nghiệm và lập báo cáo chất lượng theo ca.',
            'Phát hiện và cách ly các lô hàng không đạt tiêu chuẩn.'],
        rq: ['1-2 năm kinh nghiệm QC trong nhà máy thực phẩm.',
            'Tốt nghiệp ngành công nghệ thực phẩm, hoá học hoặc sinh học.',
            'Trung thực, tuân thủ quy trình kiểm nghiệm.'],
    },
    {
        n: 'Chuyên viên QA Sản xuất', c: 'VinFast', s: ['QC/QA', 'AN TOAN LAO DONG'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 22000000, q: 3, b: 'factory',
        r: ['Xây dựng và duy trì hệ thống quản lý chất lượng theo tiêu chuẩn IATF 16949.',
            'Đánh giá nội bộ các quy trình sản xuất và theo dõi hành động khắc phục.',
            'Phân tích dữ liệu lỗi và làm việc với nhà cung cấp về chất lượng linh kiện.'],
        rq: ['2-4 năm kinh nghiệm QA trong sản xuất, ưu tiên ngành ô tô hoặc điện tử.',
            'Hiểu về các công cụ chất lượng: 5 Why, FMEA, SPC.',
            'Tốt nghiệp đại học ngành kỹ thuật; tiếng Anh đọc tài liệu tốt.'],
    },
    {
        n: 'Chuyên viên An toàn Lao động', c: 'VinFast', s: ['AN TOAN LAO DONG'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 20000000, q: 2, b: 'factory',
        r: ['Xây dựng và triển khai các quy định, quy trình an toàn trong nhà máy.',
            'Tổ chức huấn luyện an toàn định kỳ cho người lao động.',
            'Kiểm tra hiện trường, phát hiện và yêu cầu khắc phục các nguy cơ mất an toàn.',
            'Điều tra sự cố, tai nạn lao động và lập báo cáo theo quy định.'],
        rq: ['2-4 năm kinh nghiệm an toàn lao động trong môi trường nhà máy.',
            'Có chứng chỉ huấn luyện an toàn, vệ sinh lao động.',
            'Nắm vững các quy định pháp luật về an toàn lao động.'],
    },
    {
        n: 'Giám sát An toàn Lao động', c: 'Novaland', s: ['AN TOAN LAO DONG'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 30000000, q: 2, b: 'factory',
        r: ['Giám sát công tác an toàn tại các công trường xây dựng dự án.',
            'Kiểm tra biện pháp thi công an toàn của nhà thầu trước khi triển khai.',
            'Đình chỉ các hoạt động vi phạm nghiêm trọng về an toàn.',
            'Báo cáo tình hình an toàn cho ban quản lý dự án.'],
        rq: ['Từ 5 năm kinh nghiệm an toàn trong lĩnh vực xây dựng.',
            'Có chứng chỉ an toàn lao động và kinh nghiệm quản lý nhà thầu.',
            'Bản lĩnh, quyết đoán khi xử lý vi phạm.'],
    },

    // ===== Dịch vụ / Nhà hàng / Khách sạn =====
    {
        n: 'Nhân viên Pha chế (Barista)', c: 'Highlands Coffee', s: ['PHA CHE'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 8000000, q: 40, b: 'retail',
        r: ['Pha chế cà phê, trà và các loại đồ uống theo đúng công thức chuẩn.',
            'Giữ gìn vệ sinh quầy bar và bảo quản nguyên liệu đúng quy định.',
            'Hỗ trợ tiếp nhận đơn hàng và phục vụ khách vào giờ cao điểm.'],
        rq: ['Không yêu cầu kinh nghiệm, được đào tạo pha chế miễn phí.',
            'Nhanh nhẹn, sạch sẽ, thái độ vui vẻ với khách.',
            'Chấp nhận làm theo ca, kể cả cuối tuần và ngày lễ.'],
    },
    {
        n: 'Barista Trưởng quầy', c: 'Highlands Coffee', s: ['PHA CHE', 'DAO TAO NOI BO'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 12000000, q: 10, b: 'retail',
        r: ['Phụ trách chất lượng đồ uống và vận hành quầy bar trong ca.',
            'Đào tạo và kèm cặp nhân viên pha chế mới.',
            'Quản lý định lượng nguyên liệu, hạn chế thất thoát.',
            'Xử lý phản hồi của khách về đồ uống.'],
        rq: ['1-2 năm kinh nghiệm pha chế, ưu tiên đã làm tại chuỗi cà phê.',
            'Nắm chuẩn công thức và kỹ thuật chiết xuất espresso.',
            'Có khả năng hướng dẫn người khác.'],
    },
    {
        n: 'Nhân viên Phục vụ', c: 'Highlands Coffee', s: ['PHUC VU'],
        lv: 'INTERN', loc: 'HANOI', sal: 6000000, q: 30, b: 'retail',
        r: ['Chào đón, hướng dẫn khách và tiếp nhận gọi món.',
            'Phục vụ đồ uống, dọn bàn và giữ gìn không gian quán sạch sẽ.',
            'Hỗ trợ thu ngân khi cần.'],
        rq: ['Sinh viên hoặc người tìm việc làm thêm; không yêu cầu kinh nghiệm.',
            'Làm được tối thiểu 4 ca mỗi tuần, mỗi ca 4-5 tiếng.',
            'Thái độ lịch sự, chăm chỉ.'],
    },
    {
        n: 'Nhân viên Phục vụ Nhà hàng', c: 'Tập đoàn Vingroup', s: ['PHUC VU'],
        lv: 'FRESHER', loc: 'DANANG', sal: 9000000, q: 25, b: 'retail',
        r: ['Phục vụ khách tại nhà hàng trong khu nghỉ dưỡng theo tiêu chuẩn dịch vụ.',
            'Sắp xếp bàn tiệc, chuẩn bị dụng cụ trước mỗi buổi phục vụ.',
            'Giới thiệu thực đơn và giải đáp thắc mắc của khách.'],
        rq: ['Tốt nghiệp THPT trở lên; ưu tiên có kinh nghiệm nhà hàng, khách sạn.',
            'Tiếng Anh giao tiếp cơ bản để phục vụ khách quốc tế.',
            'Ngoại hình gọn gàng, thái độ chuyên nghiệp.'],
    },
    {
        n: 'Lễ tân Khách sạn', c: 'Tập đoàn Vingroup', s: ['LE TAN'],
        lv: 'FRESHER', loc: 'DANANG', sal: 10000000, q: 8, b: 'retail',
        r: ['Làm thủ tục nhận và trả buồng cho khách.',
            'Tiếp nhận và xử lý yêu cầu, phản hồi của khách trong thời gian lưu trú.',
            'Phối hợp với bộ phận buồng phòng và nhà hàng để phục vụ khách.'],
        rq: ['Tốt nghiệp cao đẳng, đại học ngành du lịch, khách sạn hoặc ngoại ngữ.',
            'Tiếng Anh giao tiếp tốt; biết thêm ngoại ngữ khác là lợi thế.',
            'Ngoại hình thiện cảm, chấp nhận làm theo ca.'],
    },
    {
        n: 'Nhân viên Buồng phòng', c: 'Tập đoàn Vingroup', s: ['BUONG PHONG'],
        lv: 'FRESHER', loc: 'DANANG', sal: 9000000, q: 20, b: 'retail',
        r: ['Dọn dẹp và sắp xếp buồng khách theo tiêu chuẩn của khu nghỉ dưỡng.',
            'Kiểm tra và bổ sung đồ dùng, vật phẩm trong phòng.',
            'Báo cáo các hư hỏng thiết bị trong phòng cho bộ phận kỹ thuật.',
            'Bàn giao tài sản khách để quên cho bộ phận liên quan.'],
        rq: ['Không yêu cầu kinh nghiệm, được đào tạo theo tiêu chuẩn khách sạn.',
            'Sức khoẻ tốt, sạch sẽ, cẩn thận và trung thực.',
            'Chấp nhận làm theo ca.'],
    },
    {
        n: 'Giám sát Buồng phòng', c: 'Tập đoàn Vingroup', s: ['BUONG PHONG', 'DAO TAO NOI BO'],
        lv: 'MIDDLE', loc: 'DANANG', sal: 16000000, q: 3, b: 'retail',
        r: ['Phân công và giám sát công việc của nhân viên buồng phòng theo ca.',
            'Kiểm tra chất lượng buồng trước khi bàn giao cho lễ tân.',
            'Đào tạo nhân viên mới về tiêu chuẩn dọn phòng.',
            'Quản lý vật tư, hoá chất và đồ vải của bộ phận.'],
        rq: ['2-4 năm kinh nghiệm buồng phòng, tối thiểu 1 năm giám sát.',
            'Nắm tiêu chuẩn buồng phòng của khách sạn 4-5 sao.',
            'Kỹ năng quản lý và đào tạo nhân viên.'],
    },
    {
        n: 'Đầu bếp', c: 'Highlands Coffee', s: ['BEP'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 14000000, q: 8, b: 'retail',
        r: ['Chế biến các món ăn nhẹ và bánh theo công thức chuẩn của chuỗi.',
            'Sơ chế và bảo quản nguyên liệu đúng quy định vệ sinh an toàn thực phẩm.',
            'Kiểm soát định lượng và hạn sử dụng nguyên liệu trong khu vực bếp.'],
        rq: ['1-2 năm kinh nghiệm làm bếp tại nhà hàng hoặc chuỗi F&B.',
            'Có chứng chỉ nấu ăn hoặc vệ sinh an toàn thực phẩm là lợi thế.',
            'Chịu được môi trường bếp và làm theo ca.'],
    },
    {
        n: 'Bếp trưởng', c: 'Tập đoàn Vingroup', s: ['BEP', 'AN TOAN LAO DONG'],
        lv: 'SENIOR', loc: 'DANANG', sal: 30000000, q: 2, b: 'retail',
        r: ['Quản lý toàn bộ hoạt động bếp của nhà hàng trong khu nghỉ dưỡng.',
            'Xây dựng thực đơn, tính giá thành và kiểm soát chi phí nguyên liệu.',
            'Quản lý và đào tạo đội bếp 15-25 người.',
            'Đảm bảo tuân thủ quy định vệ sinh an toàn thực phẩm và an toàn lao động trong bếp.'],
        rq: ['Từ 5 năm kinh nghiệm bếp, tối thiểu 2 năm ở vị trí bếp trưởng hoặc bếp phó.',
            'Thành thạo món Á hoặc Âu; có kinh nghiệm phục vụ tiệc lớn.',
            'Kỹ năng quản lý nhân sự và kiểm soát chi phí.'],
    },

    // ===== Y tế / Giáo dục =====
    {
        n: 'Điều dưỡng Viên', c: 'Tập đoàn Vingroup', s: ['DIEU DUONG'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 15000000, q: 15, b: 'health',
        r: ['Thực hiện y lệnh của bác sĩ: tiêm, truyền, cho thuốc và theo dõi dấu hiệu sinh tồn.',
            'Chăm sóc người bệnh và hướng dẫn thân nhân cách chăm sóc tại nhà.',
            'Ghi chép hồ sơ điều dưỡng đầy đủ và bàn giao ca theo quy định.',
            'Chuẩn bị và kiểm tra dụng cụ, thuốc trước mỗi ca làm việc.'],
        rq: ['Tốt nghiệp cao đẳng hoặc đại học điều dưỡng, có chứng chỉ hành nghề.',
            '1-2 năm kinh nghiệm tại bệnh viện hoặc phòng khám.',
            'Nhẹ nhàng, kiên nhẫn với người bệnh; chấp nhận trực ca đêm.'],
    },
    {
        n: 'Điều dưỡng Trưởng', c: 'Tập đoàn Vingroup', s: ['DIEU DUONG', 'DAO TAO NOI BO'],
        lv: 'SENIOR', loc: 'HANOI', sal: 28000000, q: 2, b: 'health',
        r: ['Quản lý và phân công đội điều dưỡng của khoa theo ca.',
            'Kiểm tra, giám sát việc thực hiện quy trình điều dưỡng và kiểm soát nhiễm khuẩn.',
            'Tổ chức đào tạo, cập nhật kiến thức chuyên môn cho điều dưỡng viên.',
            'Phối hợp với trưởng khoa trong quản lý chất lượng chăm sóc người bệnh.'],
        rq: ['Từ 5 năm kinh nghiệm điều dưỡng, tối thiểu 2 năm quản lý.',
            'Tốt nghiệp đại học điều dưỡng, có chứng chỉ hành nghề.',
            'Kỹ năng quản lý đội nhóm và đào tạo.'],
    },
    {
        n: 'Dược sĩ Bán hàng', c: 'Pharmacity', s: ['DUOC SI', 'BAN HANG'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 11000000, q: 35, b: 'retail',
        r: ['Tư vấn và bán thuốc, thực phẩm chức năng theo đúng quy định chuyên môn.',
            'Kiểm tra đơn thuốc và hướng dẫn khách cách dùng thuốc.',
            'Quản lý hàng hoá, kiểm tra hạn dùng và điều kiện bảo quản thuốc.'],
        rq: ['Tốt nghiệp trung cấp, cao đẳng hoặc đại học ngành Dược.',
            'Có chứng chỉ hành nghề dược hoặc đang trong quá trình hoàn thiện.',
            'Chấp nhận làm theo ca tại nhà thuốc.'],
    },
    {
        n: 'Dược sĩ Tư vấn', c: 'Pharmacity', s: ['DUOC SI', 'TU VAN KHACH HANG'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 14000000, q: 12, b: 'retail',
        r: ['Tư vấn chuyên sâu cho khách về thuốc, tương tác thuốc và liều dùng.',
            'Hỗ trợ đào tạo kiến thức sản phẩm cho nhân viên nhà thuốc.',
            'Tham gia kiểm soát chất lượng và tuân thủ quy định GPP.'],
        rq: ['Tốt nghiệp đại học Dược, có chứng chỉ hành nghề.',
            '1-2 năm kinh nghiệm tại nhà thuốc hoặc cơ sở y tế.',
            'Giao tiếp tốt, có khả năng giải thích chuyên môn dễ hiểu.'],
    },
    {
        n: 'Giáo viên Tiểu học', c: 'Vinschool', s: ['GIANG DAY'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 18000000, q: 10, b: 'edu',
        r: ['Giảng dạy theo chương trình của trường và soạn giáo án hằng tuần.',
            'Theo dõi, đánh giá sự tiến bộ của từng học sinh trong lớp.',
            'Trao đổi thường xuyên với phụ huynh về tình hình học tập của con.',
            'Tham gia các hoạt động ngoại khoá và sinh hoạt chuyên môn của tổ.'],
        rq: ['Tốt nghiệp đại học sư phạm tiểu học hoặc có chứng chỉ nghiệp vụ sư phạm.',
            '1-2 năm kinh nghiệm giảng dạy.',
            'Yêu trẻ, kiên nhẫn và có khả năng quản lý lớp tốt.'],
    },
    {
        n: 'Giáo viên Tiếng Anh', c: 'Vinschool', s: ['GIANG DAY'],
        lv: 'MIDDLE', loc: 'HOCHIMINH', sal: 25000000, q: 6, b: 'edu',
        r: ['Giảng dạy tiếng Anh theo chương trình song ngữ của trường.',
            'Thiết kế hoạt động học tập tăng tính tương tác cho học sinh.',
            'Tổ chức kiểm tra, đánh giá năng lực ngôn ngữ định kỳ.',
            'Phối hợp với giáo viên nước ngoài trong các tiết học chung.'],
        rq: ['3-5 năm kinh nghiệm giảng dạy tiếng Anh.',
            'IELTS 7.0 trở lên hoặc tương đương; có chứng chỉ TESOL/CELTA là lợi thế.',
            'Tốt nghiệp đại học chuyên ngành ngôn ngữ Anh hoặc sư phạm Anh.'],
    },
    {
        n: 'Gia sư Toán', c: 'Vinschool', s: ['GIA SU', 'GIANG DAY'],
        lv: 'FRESHER', loc: 'HANOI', sal: 9000000, q: 12, b: 'edu',
        r: ['Kèm cặp học sinh theo nhóm nhỏ 3-5 em vào buổi chiều.',
            'Củng cố kiến thức trên lớp và hướng dẫn học sinh làm bài tập.',
            'Báo cáo tình hình tiến bộ của học sinh cho giáo viên chủ nhiệm.'],
        rq: ['Sinh viên năm cuối hoặc mới tốt nghiệp ngành toán, sư phạm toán.',
            'Nền tảng toán vững, biết cách giải thích đơn giản, dễ hiểu.',
            'Làm việc được các buổi chiều trong tuần.'],
    },
    {
        n: 'Gia sư Tiếng Anh Online', c: 'Vinschool', s: ['GIA SU'],
        lv: 'INTERN', loc: 'OTHER', sal: 6000000, q: 15, b: 'edu',
        r: ['Dạy kèm tiếng Anh trực tuyến cho học sinh tiểu học theo giáo trình có sẵn.',
            'Chuẩn bị bài và nhận xét sau mỗi buổi học.',
            'Tham gia tập huấn về phương pháp dạy học trực tuyến.'],
        rq: ['Sinh viên các ngành ngôn ngữ Anh, sư phạm hoặc có trình độ tiếng Anh tốt.',
            'Có máy tính, tai nghe và đường truyền internet ổn định.',
            'Linh hoạt thời gian buổi tối; làm việc từ xa.'],
    },

    // ===== Thiết kế / Sáng tạo =====
    {
        n: 'Thiết kế Đồ họa', c: 'Shopee Việt Nam', s: ['THIET KE DO HOA'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 17000000, q: 3, b: 'retail',
        r: ['Thiết kế banner, ấn phẩm cho các chiến dịch khuyến mại trên sàn.',
            'Đảm bảo thiết kế đúng nhận diện thương hiệu và đúng deadline chiến dịch.',
            'Chỉnh sửa thiết kế theo phản hồi của đội marketing.'],
        rq: ['1-2 năm kinh nghiệm thiết kế đồ hoạ, có portfolio.',
            'Thành thạo Photoshop, Illustrator; biết Figma là lợi thế.',
            'Xử lý được khối lượng công việc lớn trong mùa cao điểm.'],
    },
    {
        n: 'Senior Graphic Designer', c: 'Highlands Coffee', s: ['THIET KE DO HOA', 'UI/UX DESIGN'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 30000000, q: 1, b: 'retail',
        r: ['Dẫn dắt định hướng hình ảnh cho các chiến dịch thương hiệu lớn.',
            'Xây dựng và duy trì bộ nhận diện thương hiệu áp dụng toàn chuỗi.',
            'Thiết kế ấn phẩm tại điểm bán, bao bì và giao diện ứng dụng.',
            'Định hướng và phản hồi thiết kế cho các designer trong đội.'],
        rq: ['Từ 5 năm kinh nghiệm thiết kế, có portfolio về nhận diện thương hiệu.',
            'Hiểu về in ấn, chất liệu và thiết kế cho không gian bán lẻ.',
            'Kỹ năng trình bày ý tưởng thuyết phục.'],
    },
    {
        n: 'Nhân viên Dựng Video', c: 'TikTok Việt Nam', s: ['DUNG VIDEO'],
        lv: 'JUNIOR', loc: 'HANOI', sal: 18000000, q: 5, b: 'tech',
        r: ['Dựng video ngắn phục vụ truyền thông sản phẩm và hướng dẫn nhà sáng tạo.',
            'Xử lý âm thanh, phụ đề và hiệu ứng chuyển cảnh.',
            'Phối hợp với đội nội dung từ bước lên kịch bản tới thành phẩm.',
            'Quản lý và lưu trữ tư liệu video của đội.'],
        rq: ['1-2 năm kinh nghiệm dựng video, có sản phẩm thực tế để giới thiệu.',
            'Thành thạo Premiere Pro hoặc Final Cut; biết After Effects là lợi thế.',
            'Nắm bắt nhanh xu hướng nội dung video ngắn.'],
    },
    {
        n: 'Video Editor Senior', c: 'Netflix Việt Nam', s: ['DUNG VIDEO'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 40000000, q: 2, b: 'tech',
        r: ['Dựng trailer và các nội dung quảng bá cho phim, series khu vực Việt Nam.',
            'Làm việc với đội sáng tạo và đối tác sản xuất để đảm bảo chất lượng thành phẩm.',
            'Kiểm soát màu, âm thanh và định dạng đầu ra theo chuẩn phát hành.',
            'Hướng dẫn và review công việc của các editor cấp dưới.'],
        rq: ['Từ 5 năm kinh nghiệm dựng phim hoặc nội dung quảng bá.',
            'Thành thạo Premiere Pro, DaVinci Resolve và quy trình hậu kỳ chuyên nghiệp.',
            'Có tư duy kể chuyện bằng hình ảnh; tiếng Anh làm việc tốt.'],
    },
    {
        n: 'Nhiếp ảnh gia Sản phẩm', c: 'Tiki Corporation', s: ['NHIEP ANH', 'THIET KE DO HOA'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 16000000, q: 3, b: 'retail',
        r: ['Chụp ảnh sản phẩm trong studio phục vụ đăng bán trên sàn.',
            'Set up ánh sáng, bố cục và hậu kỳ ảnh theo chuẩn hình ảnh của Tiki.',
            'Xử lý khối lượng lớn ảnh sản phẩm theo tiến độ mỗi ngày.'],
        rq: ['1-2 năm kinh nghiệm chụp ảnh sản phẩm, có portfolio.',
            'Thành thạo Lightroom, Photoshop và kỹ thuật ánh sáng studio.',
            'Làm việc có tổ chức, đáp ứng được deadline.'],
    },
    {
        n: 'Nhiếp ảnh gia', c: 'Lazada Việt Nam', s: ['NHIEP ANH'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 12000000, q: 3, b: 'retail',
        r: ['Hỗ trợ chụp ảnh sản phẩm và ảnh sự kiện nội bộ.',
            'Hậu kỳ ảnh cơ bản: cắt, chỉnh sáng, xoá nền.',
            'Quản lý và sắp xếp thư viện ảnh của bộ phận.'],
        rq: ['Tốt nghiệp hoặc đang học ngành nhiếp ảnh, thiết kế; có sản phẩm cá nhân.',
            'Biết sử dụng máy ảnh DSLR/mirrorless và Lightroom.',
            'Ham học, chịu được công việc lặp lại khối lượng lớn.'],
    },

    // ===== Bất động sản / Pháp lý =====
    {
        n: 'Chuyên viên Môi giới Bất động sản', c: 'Novaland', s: ['MOI GIOI BAT DONG SAN'],
        lv: 'FRESHER', loc: 'HOCHIMINH', sal: 12000000, q: 30, b: 'retail',
        r: ['Tìm kiếm khách hàng và giới thiệu các sản phẩm căn hộ, nhà phố của tập đoàn.',
            'Dẫn khách tham quan nhà mẫu và tư vấn phương án tài chính, vay vốn.',
            'Hỗ trợ khách hoàn thiện thủ tục đặt cọc và ký hợp đồng.'],
        rq: ['Không yêu cầu kinh nghiệm, được đào tạo bài bản về sản phẩm và kỹ năng bán hàng.',
            'Giao tiếp tốt, chủ động, mong muốn thu nhập cao từ hoa hồng.',
            'Có phương tiện đi lại và ngoại hình gọn gàng.'],
    },
    {
        n: 'Trưởng phòng Môi giới', c: 'Novaland', s: ['MOI GIOI BAT DONG SAN', 'BAN HANG'],
        lv: 'SENIOR', loc: 'HOCHIMINH', sal: 40000000, q: 3, b: 'retail',
        r: ['Quản lý phòng kinh doanh 20-30 chuyên viên môi giới.',
            'Lập và triển khai kế hoạch bán hàng cho từng giai đoạn mở bán dự án.',
            'Tuyển dụng, đào tạo và giữ chân nhân sự kinh doanh.',
            'Báo cáo kết quả kinh doanh trực tiếp cho giám đốc khối.'],
        rq: ['Từ 5 năm kinh nghiệm bất động sản, tối thiểu 2 năm quản lý phòng kinh doanh.',
            'Có mạng lưới khách hàng và đội ngũ sẵn có là lợi thế lớn.',
            'Năng lực quản lý chỉ tiêu và tạo động lực cho đội.'],
    },
    {
        n: 'Chuyên viên Tư vấn Pháp lý', c: 'Tập đoàn Vingroup', s: ['TU VAN PHAP LY'],
        lv: 'MIDDLE', loc: 'HANOI', sal: 28000000, q: 2, b: 'bank',
        r: ['Tư vấn pháp lý cho các hoạt động đầu tư, kinh doanh của các đơn vị thành viên.',
            'Rà soát và thẩm định tính pháp lý của hồ sơ dự án.',
            'Đại diện làm việc với các cơ quan nhà nước về thủ tục pháp lý.',
            'Cảnh báo và đề xuất phương án xử lý rủi ro pháp lý.'],
        rq: ['2-4 năm kinh nghiệm pháp chế doanh nghiệp hoặc công ty luật.',
            'Tốt nghiệp đại học luật; có thẻ luật sư là lợi thế.',
            'Nắm vững pháp luật doanh nghiệp, đầu tư và đất đai.'],
    },
    {
        n: 'Chuyên viên Pháp chế', c: 'Techcombank', s: ['TU VAN PHAP LY', 'SOAN THAO HOP DONG'],
        lv: 'SENIOR', loc: 'HANOI', sal: 38000000, q: 2, b: 'bank',
        r: ['Chủ trì soạn thảo và thẩm định các hợp đồng tín dụng, hợp đồng hợp tác lớn.',
            'Tư vấn pháp lý cho các sản phẩm ngân hàng mới trước khi ra mắt.',
            'Xử lý tranh chấp và làm việc với đơn vị tư vấn luật bên ngoài.',
            'Cập nhật và phổ biến các thay đổi pháp luật liên quan tới hoạt động ngân hàng.'],
        rq: ['Từ 5 năm kinh nghiệm pháp chế, ưu tiên trong lĩnh vực tài chính - ngân hàng.',
            'Nắm vững Luật Các tổ chức tín dụng và pháp luật về giao dịch bảo đảm.',
            'Tiếng Anh pháp lý tốt; kỹ năng soạn thảo chặt chẽ.'],
    },
    {
        n: 'Nhân viên Soạn thảo Hợp đồng', c: 'Novaland', s: ['SOAN THAO HOP DONG'],
        lv: 'JUNIOR', loc: 'HOCHIMINH', sal: 16000000, q: 3, b: 'retail',
        r: ['Soạn thảo hợp đồng mua bán, đặt cọc theo mẫu và theo từng dự án.',
            'Kiểm tra thông tin khách hàng và điều khoản trước khi trình ký.',
            'Quản lý, lưu trữ và theo dõi tình trạng hợp đồng đã ký.'],
        rq: ['1-2 năm kinh nghiệm soạn thảo hợp đồng hoặc pháp lý bất động sản.',
            'Tốt nghiệp đại học luật hoặc ngành liên quan.',
            'Cực kỳ cẩn thận với câu chữ và số liệu trong hợp đồng.'],
    },
];

// ---------------------------------------------------------------------------
// Chạy
// ---------------------------------------------------------------------------

/** Đọc MONGO_URL từ back-end/.env (không thêm dependency dotenv). */
function readMongoUrl() {
    if (process.env.MONGO_URL) return process.env.MONGO_URL;

    const envPath = path.resolve(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        throw new Error(`Không tìm thấy ${envPath} và biến môi trường MONGO_URL cũng chưa được đặt.`);
    }
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*MONGO_URL\s*=\s*(.+?)\s*$/);
        if (m) return m[1].replace(/^["']|["']$/g, '');
    }
    throw new Error('Không tìm thấy MONGO_URL trong back-end/.env');
}

/**
 * Nhãn đánh dấu job do script này tạo.
 *
 * Dùng để phân biệt job seed với job do người dùng tự tạo, nhờ đó bước kiểm tra
 * bên dưới có thể từ chối ghi đè lên dữ liệu không phải của script.
 * Muốn xoá toàn bộ job seed:  db.jobs.deleteMany({ seedSource: SEED_SOURCE })
 */
const SEED_SOURCE = 'seed-jobs';

/**
 * Số ngày hiệu lực của tin, suy ra từ tên job thay vì random.
 *
 * Cố tình không dùng Math.random: nếu random thì mỗi lần chạy lại toàn bộ 100 tin
 * sẽ bị đổi endDate, script không còn idempotent thật sự.
 */
function durationDays(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) % 100000;
    }
    return 45 + (hash % 76); // 45..120 ngày
}

async function main() {
    await mongoose.connect(readMongoUrl());

    try {
        const db = mongoose.connection.db;

        // Kiểm tra skill có nằm trong taxonomy — skill lệch sẽ không bao giờ khớp
        // khi lọc job, nên phải chặn ngay tại đây.
        const constantsPath = path.resolve(
            __dirname, '..', 'src', 'cv-matching', 'cv-matching.constants.ts',
        );
        const src = fs.readFileSync(constantsPath, 'utf8');
        const block = src.slice(
            src.indexOf('export const CANONICAL_SKILLS'),
            src.indexOf('export const CANONICAL_LOCATIONS'),
        );
        const canonical = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
        const badSkills = [
            ...new Set(JOBS.flatMap((j) => j.s).filter((s) => !canonical.includes(s))),
        ];
        if (badSkills.length) {
            throw new Error(
                'Các skill sau không có trong CANONICAL_SKILLS: ' + badSkills.join(', '),
            );
        }

        // Lấy công ty theo tên (schema Job nhúng company chứ không dùng ref).
        const companies = await db.collection('companies').find({}).toArray();
        const byName = new Map(companies.map((c) => [c.name, c]));
        const missingCompanies = [
            ...new Set(JOBS.map((j) => j.c).filter((n) => !byName.has(n))),
        ];
        if (missingCompanies.length) {
            throw new Error(
                'Không tìm thấy công ty trong DB: ' + missingCompanies.join(', '),
            );
        }

        // Ghi nhận người tạo là tài khoản admin, giống các job đang có.
        const admin =
            (await db.collection('users').findOne({ email: 'admin@gmail.com' })) ||
            (await db.collection('users').findOne({}));
        if (!admin) throw new Error('Collection users đang rỗng, không xác định được createdBy.');

        // Chặn ghi đè job không do script này tạo.
        // Script upsert theo (name + company._id), nên nếu trong DB đã có tin cùng
        // tên ở cùng công ty do người khác tạo thì tin đó sẽ bị ghi đè và mất dữ
        // liệu gốc. Phát hiện trước và dừng lại, trừ khi chạy với --force.
        const force = process.argv.includes('--force');
        const collisions = [];
        for (const job of JOBS) {
            const company = byName.get(job.c);
            const existing = await db.collection('jobs').findOne(
                { name: job.n, 'company._id': company._id },
                { projection: { seedSource: 1, name: 1 } },
            );
            if (existing && existing.seedSource !== SEED_SOURCE) {
                collisions.push(`${job.n} @ ${job.c}`);
            }
        }
        if (collisions.length && !force) {
            throw new Error(
                'Các tin sau đã tồn tại trong DB và KHÔNG do script này tạo — ' +
                'chạy tiếp sẽ ghi đè dữ liệu gốc:\n' +
                collisions.map((c) => '  - ' + c).join('\n') +
                '\nHãy đổi tên tin trong JOBS, hoặc chạy lại với --force nếu thực sự muốn ghi đè.',
            );
        }
        if (collisions.length && force) {
            console.warn(`Cảnh báo: --force sẽ ghi đè ${collisions.length} tin có sẵn.`);
        }

        const now = new Date();
        // Neo startDate/endDate vào 0h hôm nay thay vì thời điểm chạy: nhờ vậy chạy
        // lại nhiều lần trong cùng một ngày cho ra đúng cùng giá trị (script
        // idempotent), nhưng chạy lại sau vài tuần vẫn gia hạn được các tin đã hết.
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const ops = JOBS.map((job) => {
            const company = byName.get(job.c);
            // endDate luôn ở tương lai để tin hiển thị được và khớp ở tầng lọc đầu
            // tiên của tính năng gợi ý việc làm bằng AI.
            const endDate = new Date(
                today.getTime() + durationDays(job.n) * 86400000,
            );

            return {
                updateOne: {
                    filter: { name: job.n, 'company._id': company._id },
                    update: {
                        $set: {
                            name: job.n,
                            skills: job.s,
                            company: {
                                _id: company._id,
                                name: company.name,
                                logo: company.logo,
                            },
                            location: job.loc,
                            salary: job.sal,
                            quantity: job.q,
                            level: job.lv,
                            description: buildDescription(job.r, job.rq, job.b),
                            startDate: today,
                            endDate,
                            isActive: true,
                            seedSource: SEED_SOURCE,
                        },
                        // updatedAt chỉ đặt khi tạo mới, không cập nhật mỗi lần chạy:
                        // danh sách job ở cả jobs.service.ts và phần lọc job của
                        // cv-matching đều sort theo updatedAt giảm dần, nếu chạm vào
                        // nó thì mỗi lần seed lại sẽ đẩy 100 tin này lên đầu danh sách.
                        $setOnInsert: {
                            createdBy: { _id: admin._id, email: admin.email },
                            isDeleted: false,
                            deletedAt: null,
                            createdAt: now,
                            updatedAt: now,
                            __v: 0,
                        },
                    },
                    upsert: true,
                },
            };
        });

        const before = await db.collection('jobs').countDocuments();
        const res = await db.collection('jobs').bulkWrite(ops, { ordered: false });
        const after = await db.collection('jobs').countDocuments();

        console.log(`Đã chuẩn bị     : ${JOBS.length} tin tuyển dụng`);
        console.log(`Thêm mới        : ${res.upsertedCount}`);
        console.log(`Cập nhật        : ${res.modifiedCount}`);
        console.log(`Tổng job trước  : ${before}`);
        console.log(`Tổng job sau    : ${after}`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error('Seed thất bại:', err.message);
    process.exit(1);
});

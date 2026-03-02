import { grey, green, blue, red, orange } from '@ant-design/colors';

export const SKILLS_LIST =
    [
        // IT
  { label: "React.JS", value: "REACT.JS" },
  { label: "React Native", value: "REACT NATIVE" },
  { label: "Vue.JS", value: "VUE.JS" },
  { label: "Angular", value: "ANGULAR" },
  { label: "Nest.JS", value: "NEST.JS" },
  { label: "TypeScript", value: "TYPESCRIPT" },
  { label: "Java", value: "JAVA" },
  { label: "Frontend", value: "FRONTEND" },
  { label: "Backend", value: "BACKEND" },
  { label: "Fullstack", value: "FULLSTACK" },

  // Sales / Marketing
  { label: "Bán hàng", value: "BAN HANG" },
  { label: "Tư vấn khách hàng", value: "TU VAN KHACH HANG" },
  { label: "Digital Marketing", value: "DIGITAL MARKETING" },
  { label: "SEO", value: "SEO" },
  { label: "Content Marketing", value: "CONTENT MARKETING" },
  { label: "Chạy quảng cáo", value: "CHAY QUANG CAO" },
  { label: "Telesales", value: "TELESALES" },

  // Kế toán / Tài chính
  { label: "Kế toán tổng hợp", value: "KE TOAN TONG HOP" },
  { label: "Kế toán thuế", value: "KE TOAN THUE" },
  { label: "Phân tích tài chính", value: "PHAN TICH TAI CHINH" },
  { label: "Kiểm toán", value: "KIEM TOAN" },

  // Nhân sự / Hành chính
  { label: "Tuyển dụng", value: "TUYEN DUNG" },
  { label: "C&B", value: "C&B" },
  { label: "Đào tạo nội bộ", value: "DAO TAO NOI BO" },
  { label: "Hành chính văn phòng", value: "HANH CHINH VAN PHONG" },

  // Vận hành / Logistics
  { label: "Quản lý kho", value: "QUAN LY KHO" },
  { label: "Điều phối vận tải", value: "DIEU PHOI VAN TAI" },
  { label: "Xuất nhập khẩu", value: "XUAT NHAP KHAU" },
  { label: "Chuỗi cung ứng", value: "CHUOI CUNG UNG" },

  // Sản xuất / Kỹ thuật
  { label: "Vận hành máy", value: "VAN HANH MAY" },
  { label: "Bảo trì thiết bị", value: "BAO TRI THIET BI" },
  { label: "QC/QA", value: "QC/QA" },
  { label: "An toàn lao động", value: "AN TOAN LAO DONG" },

  // Dịch vụ / Nhà hàng / Khách sạn
  { label: "Pha chế", value: "PHA CHE" },
  { label: "Phục vụ", value: "PHUC VU" },
  { label: "Lễ tân", value: "LE TAN" },
  { label: "Buồng phòng", value: "BUONG PHONG" },
  { label: "Bếp", value: "BEP" },

  // Y tế / Giáo dục
  { label: "Điều dưỡng", value: "DIEU DUONG" },
  { label: "Dược sĩ", value: "DUOC SI" },
  { label: "Giảng dạy", value: "GIANG DAY" },
  { label: "Gia sư", value: "GIA SU" },

  // Thiết kế / Sáng tạo
  { label: "Thiết kế đồ họa", value: "THIET KE DO HOA" },
  { label: "UI/UX Design", value: "UI/UX DESIGN" },
  { label: "Dựng video", value: "DUNG VIDEO" },
  { label: "Nhiếp ảnh", value: "NHIEP ANH" },

  // Bất động sản / Pháp lý
  { label: "Môi giới bất động sản", value: "MOI GIOI BAT DONG SAN" },
  { label: "Tư vấn pháp lý", value: "TU VAN PHAP LY" },
  { label: "Soạn thảo hợp đồng", value: "SOAN THAO HOP DONG" }
    ];

export const LOCATION_LIST =
    [
        { label: "Hà Nội", value: "HANOI" },
        { label: "Hồ Chí Minh", value: "HOCHIMINH" },
        { label: "Đà Nẵng", value: "DANANG" },
        { label: "Others", value: "OTHER" },
        { label: "Tất cả thành phố", value: "ALL" },
    ];

export const nonAccentVietnamese = (str: string) => {
    str = str.replace(/A|Á|À|Ã|Ạ|Â|Ấ|Ầ|Ẫ|Ậ|Ă|Ắ|Ằ|Ẵ|Ặ/g, "A");
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/E|É|È|Ẽ|Ẹ|Ê|Ế|Ề|Ễ|Ệ/, "E");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/I|Í|Ì|Ĩ|Ị/g, "I");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/O|Ó|Ò|Õ|Ọ|Ô|Ố|Ồ|Ỗ|Ộ|Ơ|Ớ|Ờ|Ỡ|Ợ/g, "O");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/U|Ú|Ù|Ũ|Ụ|Ư|Ứ|Ừ|Ữ|Ự/g, "U");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/Y|Ý|Ỳ|Ỹ|Ỵ/g, "Y");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/đ/g, "d");
    // Some system encode vietnamese combining accent as individual utf-8 characters
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // Huyền sắc hỏi ngã nặng
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // Â, Ê, Ă, Ơ, Ư
    return str;
}


export const convertSlug = (str: string) => {
    str = nonAccentVietnamese(str);
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    const from = "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆĞÍÌÎÏİŇÑÓÖÒÔÕØŘŔŠŞŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇğíìîïıňñóöòôõøðřŕšşťúůüùûýÿžþÞĐđßÆa·/_,:;";
    const to = "AAAAAACCCDEEEEEEEEGIIIIINNOOOOOORRSSTUUUUUYYZaaaaaacccdeeeeeeeegiiiiinnooooooorrsstuuuuuyyzbBDdBAa------";
    for (let i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

export const getLocationName = (value: string) => {
    const locationFilter = LOCATION_LIST.filter(item => item.value === value);
    if (locationFilter.length) return locationFilter[0].label;
    return 'unknown'
}

export function colorMethod(method: "POST" | "PUT" | "GET" | "DELETE" | string) {
    switch (method) {
        case "POST":
            return green[6]
        case "PUT":
            return orange[6]
        case "GET":
            return blue[6]
        case "DELETE":
            return red[6]
        default:
            return grey[10];
    }
}
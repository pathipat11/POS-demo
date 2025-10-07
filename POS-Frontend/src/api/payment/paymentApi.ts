import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ฟังก์ชันสำหรับบันทึกข้อมูลการชำระเงินและสร้างใบเสร็จ
export const createPayment = async (paymentData: {
    saleId: string;
    employeeName: string;
    paymentMethod: "เงินสด" | "โอนเงิน" | "บัตรเครดิต" | "QR Code";
    amountReceived: number;
    amount: number;
    change: number; // ✅ เพิ่มบรรทัดนี้
    items: Array<{
        barcode: string;
        name: string;
        price: number;
        quantity: number;
        subtotal: number;
    }>;
}) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/payment/create`, paymentData);

        if (response.data.success) {
            return response.data;
        } else {
            return { success: false, message: "เกิดข้อผิดพลาดในการสร้างรายการชำระเงินและใบเสร็จ" };
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการสร้างรายการชำระเงินและใบเสร็จ:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างรายการชำระเงินและใบเสร็จ" };
    }
};


// ดึงข้อมูลการชำระเงินของออเดอร์
export const getPaymentByOrderId = async (orderId: string) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/payment/order/${orderId}`);
        return response.data;
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน:", error);
        return { success: false, message: "ไม่พบข้อมูลการชำระเงิน" };
    }
};

// ดึงข้อมูลใบเสร็จ
export const getReceiptByPaymentId = async (paymentId: string) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/payment/receipt/${paymentId}`);
        return response.data;
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จ:", error);
        return { success: false, message: "ไม่พบข้อมูลใบเสร็จ" };
    }
};

// ดึงข้อมูลการชำระเงินทั้งหมด
export const getAllPayments = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/payment/all`);
        return response.data;
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงินทั้งหมด:", error);
        return { success: false, message: "ไม่พบข้อมูลการชำระเงิน" };
    }
};

// ดึงข้อมูลใบเสร็จทั้งหมด
export const getAllReceipts = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/payment/receipts/all`);
        return response.data;
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จทั้งหมด:", error);
        return { success: false, message: "ไม่พบข้อมูลใบเสร็จ" };
    }
};

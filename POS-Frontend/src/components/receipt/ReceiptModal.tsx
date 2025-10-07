import React from "react";
import "../../styles/receipt/ReceiptDetail.css";
import { Receipt } from "../../types/receipt";

interface ReceiptModalProps {
    receipt: Receipt;
    onClose: () => void;
}

const formatThaiDateTime = (dateString: string) =>
    new Date(dateString)
        .toLocaleString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Bangkok",
        })
        .replace("น.", "")
        .trim() + " น.";

const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
    const handlePrint = () => window.print();

    const payment =
        typeof receipt.paymentId === "object" && receipt.paymentId !== null
            ? receipt.paymentId
            : null;

    return (
        <div className="receipt-modal-overlay">
            <div className="receipt-modal-content">
                <div className="receipt-modal-paper receipt-print-area">
                    {/* 🏪 Header */}
                    <div className="receipt-modal-header">
                        <h2 className="receipt-store-name">EazyPOS Store</h2>
                        <p className="receipt-store-branch">สาขา ศรีเจริญ</p>
                        <p className="receipt-store-contact">โทร. 063-313-3099</p>
                        <hr className="receipt-separator" />
                    </div>

                    {/* 📜 ข้อมูลใบเสร็จ */}
                    <div className="receipt-info">
                        {payment?.saleId && (
                            <p>
                                <strong>รหัสการขาย:</strong> {payment.saleId}
                            </p>
                        )}
                        <p>
                            <strong>วันที่ออกใบเสร็จ:</strong>{" "}
                            {formatThaiDateTime(payment?.createdAt ?? receipt.timestamp)}
                        </p>
                        <p>
                            <strong>พนักงาน:</strong> {receipt.employeeName ?? "ไม่ระบุ"}
                        </p>
                        <p>
                            <strong>วิธีชำระเงิน:</strong>{" "}
                            {payment?.paymentMethod ?? receipt.paymentMethod}
                        </p>
                    </div>

                    <hr className="receipt-separator" />

                    {/* 🛒 รายการสินค้า */}
                    <table className="receipt-items-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>สินค้า</th>
                                <th>จำนวน</th>
                                <th>รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipt.items.map((item, index) => (
                                <tr key={item._id}>
                                    <td>{index + 1}</td>
                                    <td>{item.name}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.subtotal.toLocaleString()} ฿</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <hr className="receipt-separator" />

                    {/* 💰 สรุปยอด */}
                    <div className="receipt-summary">
                        <p>
                            <span>รวมทั้งหมด</span>
                            <strong>{receipt.totalPrice.toLocaleString()} ฿</strong>
                        </p>
                        <p>
                            <span>จำนวนเงินที่จ่าย</span>
                            <strong>{receipt.amountPaid.toLocaleString()} ฿</strong>
                        </p>
                        <p>
                            <span>เงินทอน</span>
                            <strong>{receipt.changeAmount.toLocaleString()} ฿</strong>
                        </p>
                    </div>

                    {/* 🙏 Footer */}
                    <div className="receipt-footer">
                        <p>🙏 ขอบคุณที่ใช้บริการ 🙏</p>
                        {payment?.status === "สำเร็จ" && (
                            <p style={{ fontSize: "11px", marginTop: "5px" }}>
                                (เอกสารนี้ออกโดยระบบ EazyPOS)
                            </p>
                        )}
                    </div>
                </div>

                {/* 🔘 ปุ่ม */}
                <div className="receipt-modal-actions">
                    <button className="receipt-btn-print" onClick={handlePrint}>
                        🖨️ พิมพ์ใบเสร็จ
                    </button>
                    <button className="receipt-btn-close" onClick={onClose}>
                        ✖ ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;

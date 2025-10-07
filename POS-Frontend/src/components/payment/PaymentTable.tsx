import React from "react";

interface Payment {
    _id: string;
    saleId: string;
    employeeName: string;
    paymentMethod: string;
    amount: number;
    status: string;
    createdAt: string;
}

interface PaymentTableProps {
    payments: Payment[];
    formatThaiDateTime: (date: string) => string;
    getPaymentMethodEmoji: (method: string) => string;
    getStatusEmoji: (status: string) => string;
    startIndex: number;
}

const PaymentTable: React.FC<PaymentTableProps> = ({
    payments,
    formatThaiDateTime,
    getPaymentMethodEmoji,
    getStatusEmoji,
    startIndex,
}) => {
    return (
        <table className="payment-table">
            <thead>
                <tr className="payment-header-row">
                    <th className="payment-header-cell">ลำดับ</th>
                    <th className="payment-header-cell">รหัสการขาย</th>
                    <th className="payment-header-cell">พนักงาน</th>
                    <th className="payment-header-cell">วิธีชำระเงิน</th>
                    <th className="payment-header-cell">จำนวนเงิน</th>
                    <th className="payment-header-cell">สถานะ</th>
                    <th className="payment-header-cell">วันที่</th>
                </tr>
            </thead>
            <tbody>
                {payments.length > 0 ? (
                    payments.map((payment, index) => (
                        <tr key={payment._id} className="payment-row">
                            <td className="payment-cell">{startIndex + index + 1}</td>
                            <td className="payment-cell">{payment.saleId}</td>
                            <td className="payment-cell">{payment.employeeName}</td>
                            <td className="payment-cell">
                                {getPaymentMethodEmoji(payment.paymentMethod)}
                            </td>
                            <td className="payment-cell">
                                {payment.amount.toLocaleString()} บาท
                            </td>
                            <td className="payment-cell">{getStatusEmoji(payment.status)}</td>
                            <td className="payment-cell">
                                {formatThaiDateTime(payment.createdAt)}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={7} className="payment-no-data">
                            ไม่พบข้อมูลการชำระเงิน
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

export default PaymentTable;

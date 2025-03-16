import { useEffect, useState } from "react";
import { fetchReceipts } from "../../api/receipt/receiptApi.ts";
import "../../styles/receipt/ReceiptPage.css";
import React from "react";

interface Item {
  barcode: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  _id: string;
}

interface Receipt {
  _id: string;
  paymentId: string;
  employeeName: string;
  items: Item[];
  totalPrice: number;
  paymentMethod: string;
  amountPaid: number;
  changeAmount: number;
  timestamp: string;
}

export default function ReceiptPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getReceipts = async () => {
      try {
        const response = await fetchReceipts();
        if (response.length > 0) {
          setReceipts(response);
        } else {
          setError("ไม่พบข้อมูลใบเสร็จ");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };

    getReceipts();
  }, []);

  return (
    <div className="receipt-container">
      <h1 className="receipt-title">🧾 รายการใบเสร็จ</h1>

      {loading && <p className="receipt-loading">กำลังโหลดข้อมูล...</p>}
      {error && <p className="receipt-error">{error}</p>}

      {!loading && !error && (
        <table className="receipt-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>พนักงาน</th>
              <th>ยอดรวม</th>
              <th>วิธีการชำระเงิน</th>
              <th>ดูรายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length > 0 ? (
              receipts.map((receipt, index) => (
                <tr key={receipt._id}>
                  <td>{index + 1}</td> {/* แสดงลำดับการขาย */}
                  <td>{receipt.employeeName}</td>
                  <td>{receipt.totalPrice.toLocaleString()} บาท</td>
                  <td>{receipt.paymentMethod}</td>
                  <td>
                    <a href={`/receipts/paymentId/${receipt.paymentId}`} className="view-detail">
                      🔍 ดูรายละเอียด
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="receipt-no-data">
                  ไม่พบข้อมูลใบเสร็จ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { getAllPayments } from "../../api/payment/paymentApi";
import "../../styles/payment/PaymentPage.css";
import Pagination from "../stock/component/Pagination";
import PaymentTable from "./PaymentTable";

interface Payment {
  _id: string;
  saleId: string;
  employeeName: string;
  paymentMethod: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function PaymentPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    const getPayments = async () => {
      try {
        const response = await getAllPayments();

        const data: Payment[] = Array.isArray(response)
          ? response
          : response?.data || [];

        if (data.length > 0) {
          const sortedPayments = data.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );
          setPayments(sortedPayments);
        } else {
          setError("ไม่พบข้อมูลการชำระเงิน");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };

    getPayments();
  }, []);

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

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "สำเร็จ":
        return "✅ สำเร็จ";
      case "ล้มเหลว":
        return "❌ ล้มเหลว";
      default:
        return "⏳ รอดำเนินการ";
    }
  };

  const getPaymentMethodEmoji = (method: string) => {
    switch (method) {
      case "บัตรเครดิต":
        return "💳 บัตรเครดิต";
      case "QR Code":
        return "📱 QR Code";
      case "เงินสด":
        return "💵 เงินสด";
      case "โอนผ่านธนาคาร":
        return "🏦 โอนธนาคาร";
      case "พร้อมเพย์":
        return "📲 พร้อมเพย์";
      default:
        return "💠 อื่นๆ";
    }
  };

  // 🔍 Filter
  const filteredPayments = payments.filter(
    (p) =>
      p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.saleId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 📄 Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(
    startIndex,
    startIndex + itemsPerPage
  );
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  return (
    <div className="display">
      <div className="payment-container">
        <div className="payment-header-wrapper">
          <h1 className="payment-header">💰 รายการการชำระเงิน</h1>

          {loading && <p className="payment-loading">กำลังโหลดข้อมูล...</p>}
          {error && <p className="payment-error">{error}</p>}

          {/* 🔍 Search & Controls */}
          <div className="stock-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="🔍 ค้นหา รหัสขาย / พนักงาน / วิธีชำระเงิน..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="items-per-page">
              <label>แสดง: </label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
              <span> รายการต่อหน้า</span>
            </div>
          </div>
        </div>

        {/* ✅ ตารางแยก */}
        <div className="payment-table-wrapper">
          {!loading && !error && (
            <PaymentTable
              payments={paginatedPayments}
              formatThaiDateTime={formatThaiDateTime}
              getPaymentMethodEmoji={getPaymentMethodEmoji}
              getStatusEmoji={getStatusEmoji}
              startIndex={startIndex}
            />
          )}
        </div>

        {/* ✅ Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
}

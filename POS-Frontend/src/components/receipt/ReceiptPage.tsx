import { useEffect, useState } from "react";
import { fetchReceipts } from "../../api/receipt/receiptApi";
import "../../styles/receipt/ReceiptPage.css";
import Pagination from "../stock/component/Pagination";
import ReceiptTable from "./ReceiptTable";
import ReceiptModal from "./ReceiptModal";
import { Receipt } from "../../types/receipt";


export default function ReceiptPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    const getReceipts = async () => {
      try {
        const response = await fetchReceipts();
        const data: Receipt[] = Array.isArray(response)
          ? response
          : response?.data || [];

        if (data.length > 0) {
          const sortedReceipts = data.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setReceipts(sortedReceipts);
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

  // 🔍 Filter
  const filteredReceipts = receipts.filter(
    (r) =>
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.items.some((i) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // 📄 Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(
    startIndex,
    startIndex + itemsPerPage
  );
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

  return (
    <div className="display">
      <div className="receipt-container">
        <div className="receipt-header-wrapper">
          <h1 className="receipt-header">🧾 รายการใบเสร็จ</h1>

          {loading && <p className="receipt-loading">กำลังโหลดข้อมูล...</p>}
          {error && <p className="receipt-error">{error}</p>}

          {/* 🔍 Search + Pagination Controls */}
          <div className="stock-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="🔍 ค้นหาสินค้า / พนักงาน / วิธีชำระเงิน..."
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

        {/* ✅ ตารางใบเสร็จ */}
        {!loading && !error && (
          <div className="receipt-table-wrapper">
            <ReceiptTable
              receipts={paginatedReceipts}
              formatThaiDateTime={formatThaiDateTime}
              startIndex={startIndex}
              onRowClick={(receipt) => setSelectedReceipt(receipt)} // ✅ คลิกแถวเพื่อเปิด modal
            />
          </div>
        )}

        {/* ✅ Modal แสดงใบเสร็จ */}
        {selectedReceipt && (
          <ReceiptModal
            receipt={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
          />
        )}

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

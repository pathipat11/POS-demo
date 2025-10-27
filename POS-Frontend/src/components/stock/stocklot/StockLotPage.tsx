import React, { useEffect, useState, useMemo } from "react";
import { loadStockLotData } from "./stocklotUtils";
import StockLotByProduct from "./StockLotByProduct";
import "../../../styles/stock/StockLotPage.css";

const StockLotPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // ✅ Pagination & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  /* =============================
     📦 โหลดข้อมูลจาก backend
  ============================== */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await loadStockLotData(token);
        setData(res);
      } catch (err) {
        console.error("❌ โหลดข้อมูล StockLot ไม่สำเร็จ:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  /* =============================
     🔍 กรอง + เรียงข้อมูลสินค้า
  ============================== */
  const filteredProducts = useMemo(() => {
    if (!data?.stocks) return [];

    const stocksArray = Array.isArray(data.stocks)
      ? data.stocks
      : data.stocks.data || [];

    // ✅ รวม remainingQty ของแต่ละ productId จาก lots
    const lotArray = Array.isArray(data.lots) ? data.lots : [];
    const remainingMap: Record<string, number> = {};

    lotArray.forEach((lot: any) => {
      const pid = lot.productId?._id || lot.productId;
      const remain = Number(lot.remainingQty ?? 0);
      if (!pid) return;
      remainingMap[pid] = (remainingMap[pid] || 0) + remain;
    });

    // ✅ รวมข้อมูล lot เข้า stocks
    const merged = stocksArray.map((s: any) => {
      const pid = s.productId?._id || s.productId;
      const totalRemaining = remainingMap[pid] ?? 0;
      return {
        ...s,
        totalRemaining,
      };
    });

    // ✅ ฟิลเตอร์จากชื่อหรือบาร์โค้ด
    const filtered = merged.filter((p: any) => {
      const name = p.productId?.name || p.name || "";
      const barcode = p.productId?.barcode || p.barcode || "";
      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        barcode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    // ✅ เรียงใหม่ก่อนเก่าตามวันที่เติมสต็อก
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.lastRestocked || a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.lastRestocked || b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA; // 🔁 ใหม่ก่อน
    });

    return filtered;
  }, [data, searchQuery]);

  /* =============================
     📄 Pagination
  ============================== */
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <p className="stocklot-loading">⏳ กำลังโหลดข้อมูล...</p>;
  if (!data) return <p className="stocklot-error">❌ โหลดข้อมูลไม่สำเร็จ</p>;

  /* =============================
     🧾 Render หน้าแสดงล็อตสินค้า
  ============================== */
  return (
    <div className="display">
      <div className="stocklot-container">
        {/* ---------- HEADER ---------- */}
        <div className="stocklot-header-wrapper">
          <h1 className="stocklot-header">
            📦 จัดการล็อตสินค้า (Stock Lot Management)
          </h1>

          {/* ---------- SEARCH & CONTROL BAR ---------- */}
          <div className="stocklot-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="🔍 ค้นหาสินค้า..."
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

        {/* ---------- CONTENT ---------- */}
        <div className="stocklot-content">
          <StockLotByProduct
            data={{
              ...data,
              stocks: paginatedProducts,
            }}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
          />
        </div>

        {/* ---------- PAGINATION ---------- */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="page-btn"
            >
              ⬅ ก่อนหน้า
            </button>

            <span className="page-info">
              หน้า {currentPage} จาก {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="page-btn"
            >
              ถัดไป ➡
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockLotPage;

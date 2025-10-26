import {
    getStockLots,
    getStockLotsByBarcode,
} from "../../../api/stock/stockLotApi";
import { getStockData } from "../../../api/stock/stock";
import { getPurchaseOrders } from "../../../api/purchaseOrder/purchaseOrderApi";
import { getSupplierData } from "../../../api/suppliers/supplierApi";
import { getWarehouseData } from "../../../api/warehouse/warehouseApi";
import { getCategories } from "../../../api/product/categoryApi";

/**
 * 🧩 ดึงข้อมูลทั้งหมดที่เกี่ยวข้องกับคลังสินค้า
 * รวม lots, stocks, PO, suppliers, warehouses, categories
 */
export const loadStockLotData = async (token: string) => {
    try {
        const [lots, stocks, pos, suppliers, warehouses, categories] =
            await Promise.allSettled([
                getStockLots(token),
                getStockData(token),
                getPurchaseOrders(token),
                getSupplierData(token),
                getWarehouseData(token),
                getCategories(token),
            ]);

        // ✅ ใช้ Promise.allSettled เพื่อกัน API ใด fail แล้วไม่พัง
        const safeData = (res: any) =>
            res?.status === "fulfilled"
                ? res.value?.data || res.value || []
                : [];

        const lotData = safeData(lots);
        const stockData = safeData(stocks);
        const poData = safeData(pos);
        const supplierData = safeData(suppliers);
        const warehouseData = safeData(warehouses);
        const categoryData = safeData(categories);

        // ✅ กรองข้อมูลตั้งแต่ชั้นนี้เลย (ลดภาระหน้า UI)
        const activeStocks = Array.isArray(stockData)
            ? stockData.filter((s) => s.isActive === true)
            : [];

        // ✅ รวมข้อมูลแต่ละส่วนเป็น object เดียว
        return {
            lots: Array.isArray(lotData) ? lotData : [],
            stocks: activeStocks,
            pos: Array.isArray(poData) ? poData : [],
            suppliers: Array.isArray(supplierData) ? supplierData : [],
            warehouses: Array.isArray(warehouseData) ? warehouseData : [],
            categories: Array.isArray(categoryData) ? categoryData : [],
        };
    } catch (error) {
        console.error("❌ โหลดข้อมูล StockLot ทั้งหมดล้มเหลว:", error);
        return {
            lots: [],
            stocks: [],
            pos: [],
            suppliers: [],
            warehouses: [],
            categories: [],
        };
    }
};

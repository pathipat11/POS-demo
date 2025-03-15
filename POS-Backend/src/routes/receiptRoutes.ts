import express from "express";
import {
    getAllReceipts,
    getReceiptBySaleId,
    deleteReceipt
} from "../controllers/receiptController";

const router = express.Router();

// 📌 เส้นทางสำหรับจัดการใบเสร็จ
router.get("/", getAllReceipts);          // 🔹 ดึงใบเสร็จทั้งหมด
router.get("/:saleId", getReceiptBySaleId); // 🔹 ดึงใบเสร็จจาก saleId
router.delete("/:saleId", deleteReceipt);   // 🔹 ลบใบเสร็จตาม saleId

export default router;

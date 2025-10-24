import { Request, Response } from "express";
import mongoose from "mongoose";
import QC from "../models/QualityControl";
import Product from "../models/Product";
import Stock from "../models/Stock";
import StockLot from "../models/StockLot";
import Supplier from "../models/Supplier";
import Warehouse from "../models/Warehouse";
import PurchaseOrder from "../models/PurchaseOrder";
import StockTransaction from "../models/StockTransaction";
import cloudinary from "../utils/cloudinary";
import { verifyToken } from "../utils/auth";
import { updateStockTotalFromLots } from "../utils/qcHelpers";
import { ReturnDocument } from "mongodb";

/* =========================================================
   Helpers
========================================================= */
function getUserIdFromReq(req: Request): string | null {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) return null;
    return decoded.userId as string;
}

/* =========================================================
   CREATE QC RECORD (แนบรูป + อัปเดตวันหมดอายุใน StockLot)
   ❗️ไม่แตะ stock หรือ transaction แล้ว
========================================================= */
export const createQCRecord = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getUserIdFromReq(req);
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const {
            batchNumber,
            productId,
            supplierId,
            warehouseId,
            temperature,
            humidity,
            status,
            issues,
            remarks,
            expiryDate, // ✅ เพิ่มฟิลด์วันหมดอายุ
        } = req.body;

        if (!batchNumber || !productId || !supplierId || !warehouseId) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }

        // ✅ ตรวจสอบความถูกต้องของข้อมูลอ้างอิง
        const [product, supplier, warehouse] = await Promise.all([
            Product.findById(productId),
            Supplier.findById(supplierId),
            Warehouse.findById(warehouseId),
        ]);

        if (!product || !supplier || !warehouse) {
            res.status(404).json({
                success: false,
                message: "Product / Supplier / Warehouse not found",
            });
            return;
        }

        const lot = await StockLot.findOne({ batchNumber });
        if (!lot) {
            res
                .status(404)
                .json({ success: false, message: "ไม่พบล็อตสินค้าที่ตรงกับ batchNumber" });
            return;
        }

        // ✅ Upload attachments (ถ้ามี)
        let attachments: { url: string; public_id: string }[] = [];
        if (req.files && Object.keys(req.files).length > 0) {
            const list = Array.isArray(req.files)
                ? req.files
                : Object.values(req.files).flat();
            for (const file of list as any[]) {
                const result = await cloudinary.uploader.upload(file.path, { folder: "qc" });
                attachments.push({ url: result.secure_url, public_id: result.public_id });
            }
        }

        // ✅ สร้าง QC record
        const qcRecord = await QC.create({
            batchNumber,
            productId,
            supplierId,
            warehouseId,
            userId,
            temperature,
            humidity,
            status: status || "รอตรวจสอบ",
            issues: issues || [],
            remarks,
            attachments,
        });

        // ✅ อัปเดต StockLot (รวม expiryDate)
        lot.qcStatus = status || "รอตรวจสอบ";
        lot.status = "รอตรวจสอบ QC";
        if (expiryDate) lot.expiryDate = expiryDate;
        await lot.save();

        // ✅ ดึง StockLot ล่าสุดหลังอัปเดต
        const updatedLot = await StockLot.findOne({ batchNumber });

        // ✅ ส่งกลับทั้ง QC record และ StockLot
        res.status(201).json({
            success: true,
            message:
                "บันทึกข้อมูลการตรวจสอบคุณภาพสำเร็จ และอัปเดตวันหมดอายุใน StockLot แล้ว",
            data: {
                qcRecord,
                updatedLot,
            },
        });
    } catch (error) {
        console.error("❌ createQCRecord Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



/* =========================================================
   ดึงข้อมูล QC ตาม batchNumber (พร้อมวันหมดอายุจาก StockLot)
========================================================= */
export const getQCByBatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { batchNumber } = req.params;

        // ✅ ดึงข้อมูล QC ทั้งหมดของ batch นั้น
        const qcRecord = await QC.find({ batchNumber })
            .populate("productId", "name barcode")
            .populate("supplierId", "companyName code")
            .populate("warehouseId", "name location")
            .populate("userId", "username email");

        if (!qcRecord || qcRecord.length === 0) {
            res
                .status(404)
                .json({ success: false, message: "ไม่พบข้อมูล QC สำหรับล็อตนี้" });
            return;
        }

        // ✅ ดึงวันหมดอายุจาก StockLot
        const lot = await StockLot.findOne({ batchNumber }, "expiryDate");

        // ✅ แนบ expiryDate เข้าไปในผลลัพธ์แต่ละ record
        const enriched = qcRecord.map((record) => ({
            ...record.toObject(),
            expiryDate: lot?.expiryDate || null,
        }));

        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        console.error("❌ getQCByBatch Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* =========================================================
   UPDATE QC RECORD (แค่บันทึกผลล็อตเดียว)
========================================================= */
export const updateQCRecord = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const userId = getUserIdFromReq(req);
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const qcRecord = await QC.findById(id);
        if (!qcRecord) {
            res.status(404).json({ success: false, message: "QC Record not found" });
            return;
        }

        const lot = await StockLot.findOne({ batchNumber: qcRecord.batchNumber });
        if (!lot) {
            res.status(404).json({ success: false, message: "ไม่พบล็อตสินค้า" });
            return;
        }

        // บันทึกผลเฉพาะ QC
        qcRecord.status = status || qcRecord.status;
        qcRecord.remarks = remarks || qcRecord.remarks;
        await qcRecord.save();

        // แค่ sync สถานะในล็อต (ไม่แตะสต็อก)
        lot.qcStatus = status || "รอตรวจสอบ";
        await lot.save();

        res.status(200).json({
            success: true,
            message: `บันทึกผล QC ล็อต ${lot.batchNumber} สำเร็จ`,
            data: qcRecord,
        });
    } catch (error) {
        console.error("❌ updateQCRecord Error:", error);
        res.status(500).json({ success: false, message: "Server error while updating QC record" });
    }
};
export const updateQCStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // ✅ ตรวจ token
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }

        const userId = (decoded as any).userId;
        const po = await PurchaseOrder.findById(id);
        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบใบสั่งซื้อ" });
            return;
        }

        po.updatedBy = userId;

        /* =========================================================
           Helper Function
        ========================================================== */
        const normalizeQCStatus = (v: string) => (v === "รอตรวจ" ? "รอตรวจสอบ" : v);
        const mapQCToPOStatus = (qc: string): string => {
            switch (qc) {
                case "ผ่าน":
                    return "QC ผ่าน";
                case "ไม่ผ่าน":
                    return "ไม่ผ่าน QC - รอส่งคืนสินค้า";
                case "ผ่านบางส่วน":
                case "ตรวจบางส่วน":
                    return "QC ผ่านบางส่วน";
                default:
                    return "รอดำเนินการ";
            }
        };

        /* =========================================================
           ตัวแปรเก็บค่ารวม
        ========================================================== */
        let passedCount = 0;
        let failedCount = 0;
        let partialCount = 0;
        let restockedCount = 0;
        const totalCount = po.items?.length || 0;

        const updatedLots: any[] = [];
        const stockTransactions: any[] = [];

        /* =========================================================
           🔁 Loop ผ่านทุกสินค้าใน PO
        ========================================================== */
        for (const item of po.items as any[]) {
            const lot = await StockLot.findOne({ batchNumber: item.batchNumber });
            if (!lot) continue;

            const qcStatus = lot.qcStatus || "รอตรวจสอบ";

            // 🔒 ถ้าล็อตถูกเติมแล้ว → ข้าม
            if (lot.isStocked) {
                item.qcStatus = qcStatus;
                if (qcStatus === "ผ่าน") passedCount++;
                if (qcStatus === "ไม่ผ่าน") failedCount++;
                if (qcStatus === "ผ่านบางส่วน") partialCount++;
                continue;
            }

            const stock = await Stock.findById(lot.stockId);
            if (!stock) continue;

            /* =========================================================
               ✅ 1. ผ่านทั้งหมด
            ========================================================== */
            if (qcStatus === "ผ่าน") {
                // ตรวจว่ามีล็อตเก่าที่เติมแล้วหรือยัง
                const existingLots = await StockLot.find({
                    productId: lot.productId,
                    location: lot.location,
                    isStocked: true,
                    isActive: true,
                    qcStatus: "ผ่าน",
                    _id: { $ne: lot._id },
                });

                // ถ้าไม่มีล็อตก่อนหน้า → เซตใหม่แทนการบวก
                if (existingLots.length === 0) {
                    stock.totalQuantity = lot.quantity;
                } else {
                    stock.totalQuantity = (stock.totalQuantity ?? 0) + lot.quantity;
                }

                stock.lastRestocked = new Date();
                await stock.save();

                // สร้าง Transaction
                const txn = await StockTransaction.create({
                    stockId: stock._id,
                    productId: lot.productId,
                    stockLotId: lot._id,
                    type: "RESTOCK",
                    quantity: lot.quantity,
                    costPrice: lot.costPrice,
                    userId,
                    notes: `นำเข้าสินค้าจาก | PO ${po.purchaseOrderNumber}`,
                });
                stockTransactions.push(txn);

                // อัปเดต LOT
                lot.status = "สินค้าพร้อมขาย";
                lot.isActive = true;
                lot.isTemporary = false;
                lot.isStocked = true;
                lot.remainingQty = lot.quantity;
                lot.lastRestocked = new Date();
                await lot.save();

                item.qcStatus = "ผ่าน";
                passedCount++;
                restockedCount++;
                updatedLots.push(lot);
            }

            /* =========================================================
               ⚙️ 2. ผ่านบางส่วน
            ========================================================== */
            else if (qcStatus === "ผ่านบางส่วน") {
                const qcRecord = await QC.findOne({ batchNumber: lot.batchNumber });
                const passedQty = qcRecord?.passedQuantity ?? Math.floor(item.quantity / 2);
                const failedQty = item.quantity - passedQty;

                // ตรวจล็อตก่อนหน้า
                const existingLots = await StockLot.find({
                    productId: lot.productId,
                    location: lot.location,
                    isStocked: true,
                    isActive: true,
                    qcStatus: "ผ่าน",
                    _id: { $ne: lot._id },
                });

                if (existingLots.length === 0) {
                    stock.totalQuantity = passedQty;
                } else {
                    stock.totalQuantity = (stock.totalQuantity ?? 0) + passedQty;
                }

                stock.lastRestocked = new Date();
                await stock.save();

                // บันทึก Transaction
                const txn = await StockTransaction.create({
                    stockId: stock._id,
                    productId: lot.productId,
                    stockLotId: lot._id,
                    type: "RESTOCK",
                    quantity: passedQty,
                    costPrice: lot.costPrice,
                    userId,
                    notes: `นำเข้าสินค้าบางส่วนจาก | PO ${po.purchaseOrderNumber}`,
                });
                stockTransactions.push(txn);

                // อัปเดต LOT
                lot.status = "สินค้าพร้อมขาย";
                lot.isActive = true;
                lot.isTemporary = false;
                lot.isStocked = true;
                lot.remainingQty = passedQty;
                lot.lastRestocked = new Date();
                await lot.save();

                item.qcStatus = "ผ่านบางส่วน";
                item.returnedQuantity = failedQty;
                partialCount++;
                restockedCount++;
                updatedLots.push(lot);
            }

            /* =========================================================
               ❌ 3. ไม่ผ่าน
            ========================================================== */
            else if (qcStatus === "ไม่ผ่าน") {
                lot.status = "รอคัดออก";
                lot.isActive = false;
                lot.isTemporary = true;
                lot.remainingQty = 0;
                await lot.save();

                item.qcStatus = "ไม่ผ่าน";
                item.returnedQuantity = item.quantity;
                failedCount++;
                updatedLots.push(lot);
            }

            /* =========================================================
               🕐 4. รอตรวจสอบ
            ========================================================== */
            else {
                item.qcStatus = "รอตรวจสอบ";
            }
        }

        /* =========================================================
           🧮 สรุปสถานะรวมของใบสั่งซื้อ
        ========================================================== */
        let newQCStatus = "รอตรวจสอบ";
        if (passedCount === totalCount) newQCStatus = "ผ่าน";
        else if (failedCount === totalCount) newQCStatus = "ไม่ผ่าน";
        else if (partialCount > 0 || (passedCount > 0 && failedCount > 0))
            newQCStatus = "ผ่านบางส่วน";
        else if (passedCount > 0 || failedCount > 0)
            newQCStatus = "ตรวจบางส่วน";

        po.qcStatus = normalizeQCStatus(newQCStatus);
        po.status = mapQCToPOStatus(po.qcStatus);
        po.qcCheckedAt = new Date();
        await po.save();

        /* =========================================================
           🚫 ถ้ายังไม่มีสินค้าผ่านเลย
        ========================================================== */
        if (passedCount === 0 && failedCount === 0 && partialCount === 0) {
            res.status(400).json({
                success: false,
                message: "⚠️ ยังไม่มีสินค้าผ่าน QC กรุณาตรวจอย่างน้อย 1 รายการก่อนสรุป",
            });
            return;
        }

        /* =========================================================
           ✅ ส่งผลลัพธ์กลับ
        ========================================================== */
        res.status(200).json({
            success: true,
            message: `✅ สรุป QC สำเร็จ (${passedCount} ผ่าน / ${failedCount} ไม่ผ่าน / ${partialCount} ผ่านบางส่วน / เติม ${restockedCount} ล็อต)`,
            data: {
                purchaseOrder: po,
                updatedLots,
                stockTransactions,
            },
        });
    } catch (error) {
        console.error("❌ Update QC Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating QC",
        });
    }
};
/**
 * ลบข้อมูล QC
 * (หมายเหตุ: การลบ QC จะไม่ย้อนสถานะ LOT/Stock อัตโนมัติ เพื่อความปลอดภัยด้านข้อมูล)
 */
export const deleteQCRecord = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const qcRecord = await QC.findByIdAndDelete(id);
        if (!qcRecord) {
            res.status(404).json({ success: false, message: "ไม่พบข้อมูล QC" });
            return;
        }
        res.status(200).json({ success: true, message: "🗑️ ลบข้อมูล QC เรียบร้อย" });
    } catch (error) {
        console.error("❌ deleteQCRecord Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


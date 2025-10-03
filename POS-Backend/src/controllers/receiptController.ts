import { Request, Response } from "express";
import Receipt, { IReceipt } from "../models/Receipt";

// 📌 ฟังก์ชันดึงใบเสร็จทั้งหมด
export const getAllReceipts = async (req: Request, res: Response): Promise<void> => {
    try {
        const receipts = await Receipt.find();
        res.status(200).json({ success: true, receipts });
    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error });
    }
};

// 📌 ฟังก์ชันดึงใบเสร็จตาม `saleId`
export const getReceiptByPaymentId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { paymentId } = req.params;
        const receipt = await Receipt.findOne({ paymentId });

        if (!receipt) {
            res.status(404).json({ success: false, message: "ไม่พบใบเสร็จ" });
            return;
        }

        res.status(200).json({ success: true, receipt });
    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงใบเสร็จ", error });
    }
};
export const getReceiptSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();

        // ช่วงเวลาต่างๆ
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Fields ที่ต้องการ
        const queryFields = 'employeeName items totalPrice amountPaid changeAmount timestamp';

        // Query receipts
        const todayReceipts = await Receipt.find({ timestamp: { $gte: startOfToday } }).select(queryFields);
        const weekReceipts = await Receipt.find({ timestamp: { $gte: startOfWeek } }).select(queryFields);
        const monthReceipts = await Receipt.find({ timestamp: { $gte: startOfMonth } }).select(queryFields);

        // รวมยอด
        const calcSummary = (receipts: IReceipt[]) => ({
            totalPrice: receipts.reduce((sum, r) => sum + (r.totalPrice || 0), 0),
            amountPaid: receipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0),
            changeAmount: receipts.reduce((sum, r) => sum + (r.changeAmount || 0), 0),
            count: receipts.length,
            details: receipts.map(r => ({
                employeeName: r.employeeName,
                timestamp: r.timestamp,
                items: r.items.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    subtotal: i.subtotal
                }))
            }))
        });

        res.status(200).json({
            success: true,
            today: calcSummary(todayReceipts),
            thisWeek: calcSummary(weekReceipts),
            thisMonth: calcSummary(monthReceipts),
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล summary",
            error
        });
    }
};

// 📌 ฟังก์ชันลบใบเสร็จตาม `saleId`
export const deleteReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        const { paymentId } = req.params;
        const deletedReceipt = await Receipt.findOneAndDelete({ paymentId });

        if (!deletedReceipt) {
            res.status(404).json({ success: false, message: "ไม่พบใบเสร็จ" });
            return;
        }

        res.status(200).json({ success: true, message: "ลบใบเสร็จสำเร็จ" });
    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการลบใบเสร็จ", error });
    }
};

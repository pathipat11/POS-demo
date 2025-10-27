import { Request, Response } from "express";
import mongoose from "mongoose";
import Receipt, { IReceipt } from "../models/Receipt";
import Payment from "../models/Payment";
import User from "../models/User";
import Employee from "../models/Employee";
import { verifyToken } from "../utils/auth";

/* =============== Helper: ดึง token จากหลายแหล่ง + แปลงเป็น userId =============== */
function getAuthUserIdFromReq(req: Request): string {
    // รับจาก Header / Cookie / Query ได้หมด เพื่อกัน front ส่งมาไม่ตรง
    const header = (req.headers["authorization"] || "") as string;
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : header;
    const token =
        bearer ||
        (req.cookies && (req.cookies.token || req.cookies.auth_token)) ||
        (typeof req.query.token === "string" ? req.query.token : "");

    if (!token) throw new Error("Unauthorized");

    const decoded: any = verifyToken(token);
    if (typeof decoded === "string") throw new Error("Invalid token");

    const userId =
        decoded?.userId ??
        decoded?.id ??
        decoded?._id ??
        decoded?.data?.userId ??
        decoded?.data?.id ??
        decoded?.data?._id;

    if (!userId) throw new Error("Invalid token");
    return String(userId);
}

/* =============== Helper: แปลง userId พนักงาน -> ownerId (admin) =============== */
const getOwnerId = async (userId: string): Promise<string> => {
    let user: any = await User.findById(userId);
    if (!user) user = await Employee.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.role === "admin") return user._id.toString();
    if (user.role === "employee") {
        if (!user.adminId) throw new Error("Employee does not have admin assigned");
        return user.adminId.toString();
    }
    throw new Error("Invalid user role");
};

/* ====================== GET /receipts/getReceipt ====================== */
export const getAllReceipts = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUserId = getAuthUserIdFromReq(req);
        const ownerId = await getOwnerId(authUserId);
        const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

        const receipts = await Receipt.find({ userId: ownerObjectId })
            .populate({
                path: "paymentId",
                model: "Payment",
                select: "saleId paymentMethod amount status createdAt employeeName userId",
                match: { userId: ownerObjectId }, // กันข้อมูลข้ามร้าน
            })
            .sort({ timestamp: -1 })
            .lean();

        res.status(200).json({ success: true, receipts: receipts || [] });
    } catch (error: any) {
        const message = error?.message || "เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จทั้งหมด";
        // ส่งรายละเอียด message ให้ฝั่งหน้าเว็บเห็นเพื่อ debug
        const status = message === "Unauthorized" || message === "Invalid token" ? 401 : 500;
        console.error("getAllReceipts error:", message);
        res.status(status).json({
            success: false,
            message: status === 401 ? message : "เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จทั้งหมด",
            error: { message },
        });
    }
};

/* ====================== GET /receipts/paymentId/:paymentId ====================== */
export const getReceiptByPaymentId = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUserId = getAuthUserIdFromReq(req);
        const ownerId = await getOwnerId(authUserId);

        const { paymentId } = req.params;
        const isObjectId = mongoose.Types.ObjectId.isValid(paymentId);

        let receipt: any = null;

        if (isObjectId) {
            receipt = await Receipt.findOne({ paymentId, userId: ownerId }).populate({
                path: "paymentId",
                model: "Payment",
                select: "saleId paymentMethod amount status createdAt employeeName",
            });
            if (!receipt) {
                receipt = await Receipt.findOne({ _id: paymentId, userId: ownerId }).populate({
                    path: "paymentId",
                    model: "Payment",
                    select: "saleId paymentMethod amount status createdAt employeeName",
                });
            }
        } else {
            const pay = await Payment.findOne({ saleId: paymentId, userId: ownerId }).lean();
            if (!pay) { res.status(404).json({ success: false, message: "ไม่พบข้อมูลการชำระเงินนี้" }); return; }
            receipt = await Receipt.findOne({ paymentId: pay._id, userId: ownerId }).populate({
                path: "paymentId",
                model: "Payment",
                select: "saleId paymentMethod amount status createdAt employeeName",
            });
        }

        if (!receipt) { res.status(404).json({ success: false, message: "ไม่พบใบเสร็จ" }); return; }
        res.status(200).json({ success: true, receipt });
    } catch (error: any) {
        const message = error?.message || "เกิดข้อผิดพลาดในการดึงใบเสร็จ";
        const status = message === "Unauthorized" || message === "Invalid token" ? 401 : 500;
        console.error("getReceiptByPaymentId error:", message);
        res.status(status).json({ success: false, message, error: { message } });
    }
};

/* =========================================================
   📊 GET /receipts/summary — Public
========================================================= */
export const getReceiptSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const selectFields = "employeeName items totalPrice amountPaid changeAmount timestamp";

        const todayReceipts = await Receipt.find({
            timestamp: { $gte: startOfToday },
        }).select(selectFields);

        const weekReceipts = await Receipt.find({
            timestamp: { $gte: startOfWeek },
        }).select(selectFields);

        const monthReceipts = await Receipt.find({
            timestamp: { $gte: startOfMonth },
        }).select(selectFields);

        const calcSummary = (receipts: IReceipt[]) => ({
            totalPrice: receipts.reduce((s, r) => s + Number(r.totalPrice || 0), 0),
            amountPaid: receipts.reduce((s, r) => s + Number(r.amountPaid || 0), 0),
            changeAmount: receipts.reduce((s, r) => s + Number(r.changeAmount || 0), 0),
            count: receipts.length,
            details: receipts.map((r) => ({
                employeeName: r.employeeName,
                timestamp: r.timestamp,
                items: r.items.map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    subtotal: i.subtotal,
                })),
            })),
        });

        res.status(200).json({
            success: true,
            today: calcSummary(todayReceipts),
            thisWeek: calcSummary(weekReceipts),
            thisMonth: calcSummary(monthReceipts),
        });
    } catch (error: any) {
        console.error("getReceiptSummary error:", error);
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล summary",
        });
    }
};

/* ====================== GET /receipts/receipt/:saleId ====================== */
export const getReceiptBySaleId = async (req: Request, res: Response) => {
    try {
        const authUserId = getAuthUserIdFromReq(req);
        const ownerId = await getOwnerId(authUserId);

        const { saleId } = req.params;
        const isObjectId = mongoose.Types.ObjectId.isValid(saleId);
        let receipt: any = null;

        if (isObjectId) {
            receipt = await Receipt.findOne({
                $or: [{ _id: saleId }, { paymentId: saleId }],
                userId: ownerId,
                isReturn: false,
            }).populate("paymentId");
        } else {
            const payment = await Payment.findOne({ saleId, userId: ownerId });
            if (!payment) { res.status(404).json({ success: false, message: "ไม่พบข้อมูลการขายนี้" }); return; }
            receipt = await Receipt.findOne({
                paymentId: payment._id,
                userId: ownerId,
                isReturn: false,
            }).populate("paymentId");
        }

        if (!receipt) { res.status(404).json({ success: false, message: "ไม่พบใบเสร็จนี้" }); return; }
        res.status(200).json({ success: true, receipt });
    } catch (error: any) {
        const message = error?.message || "Server error";
        const status = message === "Unauthorized" || message === "Invalid token" ? 401 : 500;
        console.error("getReceiptBySaleId error:", message);
        res.status(status).json({ success: false, message: status === 401 ? message : "Server error", error: { message } });
    }
};

/* ====================== DELETE /receipts/:paymentId ====================== */
export const deleteReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUserId = getAuthUserIdFromReq(req);
        const ownerId = await getOwnerId(authUserId);

        const { paymentId } = req.params;
        const deleted = await Receipt.findOneAndDelete({ paymentId, userId: ownerId });

        if (!deleted) { res.status(404).json({ success: false, message: "ไม่พบใบเสร็จ" }); return; }
        res.status(200).json({ success: true, message: "ลบใบเสร็จสำเร็จ" });
    } catch (error: any) {
        const message = error?.message || "เกิดข้อผิดพลาดในการลบใบเสร็จ";
        const status = message === "Unauthorized" || message === "Invalid token" ? 401 : 500;
        console.error("deleteReceipt error:", message);
        res.status(status).json({ success: false, message, error: { message } });
    }
};
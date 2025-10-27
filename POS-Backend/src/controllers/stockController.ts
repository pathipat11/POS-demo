import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import Employee from "../models/Employee";
import Stock from "../models/Stock";
import Product from "../models/Product";
import StockTransaction from "../models/StockTransaction";
import Supplier from "../models/Supplier";
import StockLot from "../models/StockLot";
import Warehouse from "../models/Warehouse";
import { verifyToken } from "../utils/auth";

/* =========================
   🔑 resolve ownerId (string)
========================= */
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

/* =========================================================
   📦 ดึง Stock ตาม productId (จำกัดด้วย owner)
========================================================= */
export const getStockByProductId = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) { res.status(401).json({ success:false, message:"Unauthorized" }); return; }
    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) { 
      res.status(401).json({ success:false, message:"Invalid token" }); return; 
    }
    const ownerId = await getOwnerId((decoded as any).userId);

    const { productId } = req.params;
    if (!productId) { res.status(400).json({ success:false, message:"กรุณาระบุ productId" }); return; }

    const stock = await Stock.findOne({ productId, userId: ownerId })
      .populate({ path: "productId", select: "name barcode description" })
      .populate({ path: "location", model: Warehouse, select: "name code" })
      .populate({ path: "supplierId", select: "companyName" })
      .lean();

    if (!stock) { res.status(404).json({ success:false, message:"ไม่พบข้อมูลคลังของสินค้านี้" }); return; }

    res.status(200).json({ success:true, message:"ดึงข้อมูลคลังสินค้าสำเร็จ ✅", data: stock });
  } catch (error) {
    console.error("❌ Error in getStockByProductId:", error);
    res.status(500).json({ success:false, message:"Server error while fetching stock data" });
  }
};

/* =========================================================
   📦 ดึง Stock ทั้งหมด + สรุปล็อต/วันหมดอายุ (จำกัดด้วย owner)
========================================================= */
export const getStocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
      res.status(401).json({ success: false, message: "Unauthorized, no token provided" });
      return;
    }
    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }
    const ownerId = await getOwnerId((decoded as any).userId);

    const ownerObjId = new mongoose.Types.ObjectId(ownerId);

    // stocks เฉพาะของ owner
    const stocks = await Stock.find({ userId: ownerObjId })
      .populate({ path: "productId", populate: { path: "category" } })
      .populate("supplierId")
      .populate("location")
      .lean();

    // lots เฉพาะของ owner + active
    const lots = await StockLot.find({ userId: ownerObjId, isActive: true })
      .select("stockId batchNumber productId expiryDate quantity qcStatus isActive isClosed expiryStatus remainingQty")
      .lean();

    const now = new Date();
    const stockWithLots = stocks.map((stock: any) => {
      const relatedLots = lots.filter(l => String(l.stockId) === String(stock._id));

      // วันหมดอายุใกล้สุด
      const expiries = relatedLots.filter(l => l.expiryDate).map(l => new Date(l.expiryDate!))
        .sort((a,b) => a.getTime() - b.getTime());
      const nearestExpiry = expiries[0] || null;

      // จำแนกสถานะวันหมดอายุ
      const expiredLots = relatedLots.filter(l => l.expiryDate && new Date(l.expiryDate) < now);
      const nearExpiryLots = relatedLots.filter(l => {
        if (!l.expiryDate) return false;
        const d = Math.ceil((new Date(l.expiryDate).getTime() - now.getTime())/(1000*60*60*24));
        return d >= 0 && d <= 10;
      });

      let expiryStatus:
        | "ปกติ"
        | "ใกล้หมดอายุบางล็อต"
        | "ใกล้หมดอายุทั้งหมด"
        | "หมดอายุบางล็อต"
        | "หมดอายุทั้งหมด" = "ปกติ";

      if (relatedLots.length > 0) {
        if (expiredLots.length === relatedLots.length) expiryStatus = "หมดอายุทั้งหมด";
        else if (expiredLots.length > 0) expiryStatus = "หมดอายุบางล็อต";
        else if (nearExpiryLots.length === relatedLots.length) expiryStatus = "ใกล้หมดอายุทั้งหมด";
        else if (nearExpiryLots.length > 0) expiryStatus = "ใกล้หมดอายุบางล็อต";
      }

      return {
        ...stock,
        lots: relatedLots,
        expiryDate: nearestExpiry ? nearestExpiry.toISOString() : null,
        expiryStatus,
        expiredLotsCount: expiredLots.length,
        nearExpiryLotsCount: nearExpiryLots.length,
      };
    });

    res.status(200).json({
      success: true,
      message: "✅ ดึงข้อมูล stock พร้อม lot และสถานะวันหมดอายุสำเร็จ",
      data: stockWithLots,
    });
  } catch (error) {
    console.error("❌ Get Stocks Error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching stocks" });
  }
};

/* =========================================================
   🔎 ดึง stock ตาม barcode (จำกัดด้วย owner)
========================================================= */
export const getStockByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) { res.status(401).json({ success:false, message:"Unauthorized" }); return; }
    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) { 
      res.status(401).json({ success:false, message:"Invalid token" }); return; 
    }
    const ownerId = await getOwnerId((decoded as any).userId);
    const ownerObjId = new mongoose.Types.ObjectId(ownerId);

    const { barcode } = req.params;
    const stock = await Stock.findOne({ barcode, userId: ownerObjId }).populate("productId");

    if (!stock) { res.status(404).json({ success:false, message:"Stock not found" }); return; }

    res.status(200).json({
      success:true,
      data: {
        barcode: stock.barcode,
        stockQuantity: (stock as any).quantity,
        product: stock.productId,
      },
    });
  } catch (error) {
    console.error("Get Stock By Barcode Error:", error);
    res.status(500).json({ success:false, message:"Server error while fetching stock" });
  }
};

/* =========================================================
   ✏️ อัปเดต Stock (จำกัดด้วย owner + logic supplier)
========================================================= */
export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      res.status(401).json({ success: false, message: "No token provided" });
      return;
    }

    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }

    const ownerId = await getOwnerId((decoded as any).userId);
    const ownerObjId = new mongoose.Types.ObjectId(ownerId);

    const { barcode } = req.params;
    const {
      quantity,
      supplier,
      location,
      purchaseOrderId,
      threshold,
      status,
      notes,
      costPrice,
      salePrice,
      lastPurchasePrice,
      batchNumber,
      expiryDate,
      isActive,
    } = req.body;

    // ✅ ตรวจสอบ Stock ว่าอยู่ในระบบของ owner นี้
    const stock: any = await Stock.findOne({ barcode, userId: ownerObjId });
    if (!stock) {
      res
        .status(404)
        .json({ success: false, message: "Stock not found with this barcode" });
      return;
    }

    const oldQuantity = stock.totalQuantity ?? 0;

    /* ===============================
       🧾 ตรวจสอบ supplier ก่อนอนุญาตให้แก้จำนวน
    =============================== */
    let currentSupplier = "";
    if (req.body?.supplier) {
      currentSupplier = String(req.body.supplier).trim().toLowerCase();
    } else if (stock.supplier && typeof stock.supplier === "object" && "companyName" in stock.supplier) {
      currentSupplier = stock.supplier.companyName.trim().toLowerCase();
    } else if (typeof stock.supplier === "object" || typeof stock.supplier === "string") {
      const supplierDoc = await Supplier.findById(stock.supplier).lean();
      currentSupplier = supplierDoc?.companyName?.trim().toLowerCase() || "";
    }

    const isOtherSupplier = ["อื่นๆ", "อื่น ๆ", "other"].includes(currentSupplier);

    /* ===============================
       📦 อัปเดตจำนวนสินค้า (เฉพาะ supplier "อื่นๆ")
    =============================== */
    if (quantity !== undefined) {
      if (!isOtherSupplier) {
        res.status(403).json({
          success: false,
          message:
            "❌ ไม่สามารถแก้ไขจำนวนได้ เนื่องจากเป็นสินค้าของ Supplier ภายนอก",
        });
        return;
      }

      const parsedQuantity = Number(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity < 0) {
        res.status(400).json({
          success: false,
          message: "Quantity must be a non-negative number",
        });
        return;
      }

      stock.totalQuantity = parsedQuantity;

      // ✅ สร้าง StockTransaction สำหรับ ADJUSTMENT
      if (parsedQuantity !== oldQuantity) {
        const diff = parsedQuantity - oldQuantity;

        await StockTransaction.create({
          stockId: stock._id,
          productId: stock.productId,
          userId: ownerObjId,
          type: "ADJUSTMENT",
          quantity: diff, // ✅ ตรง schema
          referenceId: purchaseOrderId,
          notes: notes || `ปรับปรุงสต็อกจาก ${oldQuantity} → ${parsedQuantity}`,
          source: "SELF",
          location: stock.location,
        });

        console.log(`📦 Stock updated (${currentSupplier}) → ${oldQuantity} → ${parsedQuantity}`);

        // ✅ อัปเดต StockLot ล่าสุด (ให้จำนวนเหลือเท่ากับ stock)
        const latestLot = await StockLot.findOne({ productId: stock.productId })
          .sort({ createdAt: -1 })
          .limit(1);

        if (latestLot) {
          latestLot.remainingQty = parsedQuantity;
          latestLot.quantity = parsedQuantity;
          await latestLot.save();
          console.log(`🔄 Sync StockLot ${latestLot.batchNumber}: remainingQty → ${parsedQuantity}`);
        }
      }
    }

    /* ===============================
       🧩 อัปเดต field อื่น ๆ
    =============================== */
    if (supplier !== undefined) stock.supplier = supplier;
    if (location !== undefined) stock.location = location;
    if (threshold !== undefined) stock.threshold = threshold;
    if (status !== undefined) stock.status = status;
    if (notes !== undefined) stock.notes = notes;
    if (isActive !== undefined) stock.isActive = Boolean(isActive);

    if (costPrice !== undefined) stock.costPrice = Number(costPrice);
    if (salePrice !== undefined) stock.salePrice = Number(salePrice);
    if (lastPurchasePrice !== undefined) stock.lastPurchasePrice = Number(lastPurchasePrice);

    if (batchNumber !== undefined) stock.batchNumber = batchNumber;
    if (expiryDate !== undefined) stock.expiryDate = new Date(expiryDate);

    if (quantity !== undefined && Number(quantity) > 0)
      stock.lastRestocked = new Date();

    /* ===============================
       📊 ประเมินสถานะสินค้าตามจำนวน
    =============================== */
    if (stock.totalQuantity <= 0) stock.status = "สินค้าหมด";
    else if (stock.totalQuantity <= stock.threshold)
      stock.status = "สินค้าเหลือน้อย";
    else stock.status = "สินค้าพร้อมขาย";

    await stock.save();

    res.status(200).json({
      success: true,
      message: "อัปเดตข้อมูลสต็อกสำเร็จ ✅",
      data: stock,
    });
  } catch (error) {
    console.error("❌ Update Stock Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating stock" });
  }
};


/* =========================================================
   🔁 คืนสินค้า (จำกัดด้วย owner)
========================================================= */
export const returnProductByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) { res.status(401).json({ success:false, message:"Unauthorized" }); return; }
    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) { 
      res.status(401).json({ success:false, message:"Invalid token" }); return; 
    }
    const ownerId = await getOwnerId((decoded as any).userId);
    const ownerObjId = new mongoose.Types.ObjectId(ownerId);

    const { barcode } = req.params;
    const { quantity, orderId } = req.body;

    const stock: any = await Stock.findOne({ barcode, userId: ownerObjId });
    if (!stock) { res.status(404).json({ success:false, message:"Stock not found" }); return; }

    stock.quantity += Number(quantity || 0);
    await stock.updateStatus();
    await stock.save();

    await StockTransaction.create({
      stockId: stock._id,
      productId: stock.productId,
      type: "RETURN",
      quantity: Number(quantity || 0),
      referenceId: orderId,
      userId: ownerObjId,
      notes: "คืนสินค้า",
    });

    res.status(200).json({ success: true, message: "คืนสินค้าสำเร็จ", data: stock });
  } catch (error) {
    console.error("Return Product Error:", error);
    res.status(500).json({ success: false, message: "Server error while returning product" });
  }
};

/* =========================================================
   🗑️ ลบ Stock + Product (จำกัดด้วย owner)
========================================================= */
export const deleteStockByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) { res.status(401).json({ success:false, message:"Unauthorized" }); return; }
    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) { 
      res.status(401).json({ success:false, message:"Invalid token" }); return; 
    }
    const ownerId = await getOwnerId((decoded as any).userId);
    const ownerObjId = new mongoose.Types.ObjectId(ownerId);

    const { barcode } = req.params;

    const deletedStock = await Stock.findOneAndDelete({ barcode, userId: ownerObjId });
    if (!deletedStock) {
      res.status(404).json({ success: false, message: "Stock not found with this barcode" });
      return;
    }

    // ลบ product ที่ barcode เดียวกันได้ ถ้ามันเป็นของร้านนี้จริง ๆ
    const deletedProduct = await Product.findOneAndDelete({ barcode });

    res.status(200).json({
      success: true,
      message: "Stock deleted successfully",
      productDeleted: !!deletedProduct,
    });
  } catch (error) {
    console.error("Delete Stock Error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting stock and product" });
  }
};

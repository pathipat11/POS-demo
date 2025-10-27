import { Request, Response } from "express";
import cloudinary from "../utils/cloudinary";
import Product from "../models/Product";
import Stock from "../models/Stock";
import StockLot from "../models/StockLot";
import User from "../models/User";
import Supplier from "../models/Supplier";
import Warehouse from "../models/Warehouse";
import mongoose from "mongoose";
import { verifyToken } from "../utils/auth";
import dotenv from "dotenv";
import { generateBatchNumber } from "../utils/generateBatch";

dotenv.config();

/* ==========================
   📦 เพิ่มสินค้าใหม่หรือเพิ่มล็อตใหม่
========================== */
export const addProductWithStock = async (req: Request, res: Response): Promise<void> => {
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

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const {
      name,
      description,
      category,
      barcode,
      totalQuantity,
      location,
      threshold,
      supplierId,
      units,
      costPrice,
      salePrice,
      notes,
      batchNumber,
      expiryDate,
      isFromPO = false,
    } = req.body;

    /* ==============================
       🧩 Parse และ Normalize Data
    ============================== */
    let unitArray: any[] = [];
    try {
      if (typeof units === "string") unitArray = JSON.parse(units);
      else if (Array.isArray(units)) unitArray = units;
    } catch {
      unitArray = [];
    }

    const finalQuantity = Number(totalQuantity) || 0;
    const finalThreshold = Number(threshold) || 5;
    const finalCostPrice = Number(costPrice) || 0;
    const finalSalePrice =
      salePrice && salePrice !== "" ? Number(salePrice) : finalCostPrice * 1.2;

    /* ==============================
       🔄 จัดการ barcode อัตโนมัติ
    ============================== */
    let finalBarcode = "";
    if (barcode && typeof barcode === "string" && barcode.trim()) {
      finalBarcode = barcode.trim().replace(/^,+|,+$/g, "");
    } else if (req.body.stockBarcode && req.body.stockBarcode.trim()) {
      finalBarcode = req.body.stockBarcode.trim();
    } else {
      finalBarcode = `BC${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    /* ==============================
       🧾 ตรวจสอบ supplier / warehouse
    ============================== */
    let supplierDoc = await Supplier.findById(supplierId);
    if (!supplierDoc) {
      supplierDoc = await Supplier.findOne({ companyName: "อื่นๆ" });
      if (!supplierDoc) {
        supplierDoc = await Supplier.create({
          companyName: "อื่นๆ",
          code: "SUP-OTH",
          description: "ผู้จัดจำหน่ายทั่วไป",
        });
      }
    }

    let warehouseDoc = null;
    if (mongoose.Types.ObjectId.isValid(location)) {
      warehouseDoc = await Warehouse.findById(location);
    } else {
      warehouseDoc = await Warehouse.findOne({ name: location });
    }

    if (!warehouseDoc) {
      res.status(400).json({
        success: false,
        message: `ไม่พบคลังสินค้าที่ชื่อหรือรหัส "${location}"`,
      });
      return;
    }

    /* ==============================
       🧩 ตรวจสอบว่ามีสินค้าอยู่แล้วหรือไม่
    ============================== */
    let existingProduct = await Product.findOne({ barcode: finalBarcode });
    let newProduct = existingProduct;

    if (!existingProduct) {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No image uploaded" });
        return;
      }

      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ resource_type: "auto" }, (err, result) => {
            if (err || !result) reject(err);
            else resolve(result);
          })
          .end(req.file!.buffer);
      });

      newProduct = new Product({
        name,
        description,
        category,
        barcode: finalBarcode,
        imageUrl: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        userId: decoded.userId,
        supplierId: supplierDoc._id,
      });

      await newProduct.save();
    }

    /* ==============================
       🔢 Generate Batch Number
    ============================== */
    const finalBatchNumber =
      batchNumber && batchNumber.trim() !== ""
        ? batchNumber.trim()
        : await generateBatchNumber(
          warehouseDoc.code,
          supplierDoc.code,
          newProduct!._id.toString()
        );

    /* ==============================
       📦 สร้าง Stock
    ============================== */
    const stockStatus = isFromPO ? "รอตรวจสอบ QC" : "สินค้าพร้อมขาย";

    const newStock = new Stock({
      productId: newProduct!._id,
      userId: decoded.userId,
      totalQuantity: finalQuantity,
      supplierId: supplierDoc._id,
      supplierName: supplierDoc.companyName,
      location: warehouseDoc._id,
      threshold: finalThreshold,
      barcode: finalBarcode,
      costPrice: finalCostPrice,
      salePrice: finalSalePrice,
      lastPurchasePrice: finalCostPrice,
      batchNumber: finalBatchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes: notes || "",
      status: stockStatus,
      isTemporary: isFromPO,
      isActive: !isFromPO,
      lastRestocked: finalQuantity > 0 ? new Date() : undefined,
      units: unitArray,
    });

    await newStock.save();

    /* ==============================
       🧾 เพิ่ม StockLot แรกอัตโนมัติ
    ============================== */
    const lotStatus = isFromPO ? "รอตรวจสอบ QC" : "สินค้าพร้อมขาย";
    const lotQcStatus = isFromPO ? "รอตรวจสอบ" : "ผ่าน";

    const newLot = new StockLot({
      stockId: newStock._id,
      productId: newProduct!._id,
      supplierId: supplierDoc._id,
      supplierName: supplierDoc.companyName,
      userId: decoded.userId,
      location: warehouseDoc._id,
      batchNumber: finalBatchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      barcode: finalBarcode,
      quantity: finalQuantity,
      costPrice: finalCostPrice,
      salePrice: finalSalePrice,
      notes: notes || "",
      status: lotStatus,
      qcStatus: lotQcStatus,
      returnStatus: "ยังไม่คืน",
      isActive: true,
      isTemporary: false,
      isStocked: true,
      lastRestocked: finalQuantity > 0 ? new Date() : undefined,
    });

    // ✅ ตั้งค่า remainingQty = จำนวนที่เพิ่ม
    newLot.remainingQty = finalQuantity;

    await newLot.save();


    /* ==============================
       ✅ ตอบกลับ
    ============================== */
    res.status(201).json({
      success: true,
      message: existingProduct
        ? "เพิ่มล็อตสินค้าใหม่สำเร็จ ✅"
        : "สร้างสินค้าใหม่พร้อมล็อตแรกสำเร็จ ✅",
      data: {
        product: newProduct,
        stock: newStock,
        stockLot: newLot,
      },
    });
  } catch (error) {
    console.error("❌ addProductWithStock Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


/* =====================================================
   ✅ อัปเดตสินค้า + สต็อก (รวมรูปภาพและสถานะการขาย)
===================================================== */
export const updateProductWithStock = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ ตรวจสอบ token
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

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // ✅ ดึงข้อมูลจาก body
    const {
      productId: rawProductId,
      name,
      description,
      category,
      barcode,
      quantity,
      location,
      threshold,
      supplierId,
      units,
      costPrice,
      salePrice,
      batchNumber,
      expiryDate,
      notes,
      isActive, // ✅ รับค่ามาจาก frontend
    } = req.body;

    console.log("🟡 isActive received:", isActive);

    const productId = String(rawProductId);
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ success: false, message: "Invalid productId" });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: "ไม่พบสินค้า" });
      return;
    }

    const stock = await Stock.findOne({ productId: product._id });
    if (!stock) {
      res.status(404).json({ success: false, message: "ไม่พบสต็อกของสินค้า" });
      return;
    }

    // ✅ สร้าง barcode ใหม่ (กรณีไม่มี)
    const finalBarcode =
      typeof barcode === "string" && barcode.trim() && barcode.trim() !== ","
        ? barcode.trim().replace(/^,+|,+$/g, "")
        : `BC${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    // ✅ parse หน่วยสินค้า (units)
    let unitArray: any[] = [];
    try {
      if (typeof units === "string") {
        unitArray = JSON.parse(units);
      } else if (Array.isArray(units)) {
        unitArray = units;
      } else {
        unitArray = stock.units || [];
      }
    } catch (err) {
      console.error("❌ Error parsing units:", err);
      unitArray = stock.units || [];
    }

    // ✅ ตรวจสอบ supplier
    const supplierDoc = await Supplier.findById(supplierId || product.supplierId);
    if (!supplierDoc) {
      res.status(400).json({ success: false, message: "ไม่พบบริษัทผู้จัดจำหน่าย" });
      return;
    }

    // ✅ ตรวจสอบ warehouse
    let warehouseDoc = stock.location;
    if (location) {
      let foundWarehouse = null;
      if (mongoose.Types.ObjectId.isValid(location)) {
        foundWarehouse = await Warehouse.findById(location);
      } else {
        foundWarehouse = await Warehouse.findOne({ location });
      }
      if (!foundWarehouse) {
        res.status(400).json({ success: false, message: `ไม่พบคลังสินค้าที่ "${location}"` });
        return;
      }
      warehouseDoc = foundWarehouse._id;
    }

    /* ============================================
       ✅ ฟังก์ชันอัปเดตสินค้า + สต็อก
    ============================================ */
    const updateProductData = async (imageUrl?: string, public_id?: string) => {
      // 🧩 อัปเดตสินค้า
      product.name = name || product.name;
      product.description = description || product.description;
      product.category = category || product.category;
      product.barcode = finalBarcode;
      product.supplierId = supplierDoc._id;

      // ✅ อัปเดตสถานะเปิด/ปิดขาย
      if (typeof isActive !== "undefined") {
        product.isActive = isActive === "true" || isActive === true;
      }

      // ✅ อัปโหลดรูปภาพใหม่ (ถ้ามี)
      if (imageUrl && public_id) {
        if (product.public_id) await cloudinary.uploader.destroy(product.public_id);
        product.imageUrl = imageUrl;
        product.public_id = public_id;
      }

      await product.save();

      // 🧩 อัปเดตสต็อก
      stock.isActive =
        typeof isActive !== "undefined"
          ? isActive === "true" || isActive === true
          : stock.isActive;

      stock.costPrice = costPrice !== undefined ? Number(costPrice) : stock.costPrice;
      stock.salePrice =
        salePrice !== undefined ? Number(salePrice) : stock.salePrice || stock.costPrice * 1.2;
      if (quantity !== undefined) {
        stock.totalQuantity = Number(quantity);
      }
      stock.threshold = threshold !== undefined ? Number(threshold) : stock.threshold;
      stock.batchNumber = batchNumber || stock.batchNumber;
      stock.expiryDate = expiryDate ? new Date(expiryDate) : stock.expiryDate;
      stock.notes = notes || stock.notes;
      stock.supplierId = supplierDoc._id;
      stock.supplierName = supplierDoc.companyName;
      stock.location = warehouseDoc;
      stock.units = unitArray;
      stock.barcode = finalBarcode;

      // ✅ ถ้าสต็อกกลับมา > 0 → อัปเดต lastRestocked
      if (quantity !== undefined && Number(quantity) > 0) {
        stock.lastRestocked = new Date();
      }

      await stock.save();

      res.status(200).json({
        success: true,
        message: "✅ Product and stock updated successfully",
        data: { product, stock },
      });
    };

    /* ============================================
       ✅ อัปโหลดรูปภาพผ่าน Cloudinary
    ============================================ */
    if (req.file) {
      cloudinary.uploader
        .upload_stream({ resource_type: "auto" }, async (err, result) => {
          if (err || !result) {
            console.error(err);
            res.status(500).json({ success: false, message: "Error uploading image" });
            return;
          }
          await updateProductData(result.secure_url, result.public_id);
        })
        .end(req.file.buffer);
    } else {
      await updateProductData();
    }
  } catch (error) {
    console.error("❌ updateProductWithStock Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
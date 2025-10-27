import React, { useState } from "react";
import { getProductByBarcode } from "../../api/product/productApi";
import { BrowserBarcodeReader } from "@zxing/library";
import "../../styles/product/BarcodeUploader.css";

const BarcodeUploader = () => {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
      const imageData = reader.result;
      if (typeof imageData !== "string") {
        console.error("ข้อมูลรูปภาพไม่ถูกต้อง");
        return;
      }

      const codeReader = new BrowserBarcodeReader();
      try {
        const result = await codeReader.decodeFromImage(undefined, imageData);
        const scannedBarcode = result.getText();
        setBarcode(scannedBarcode);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการสแกนบาร์โค้ด:", error);
        alert("ไม่สามารถอ่านบาร์โค้ดได้ กรุณาใช้รูปที่คมชัดขึ้น");
      }
    };

    reader.readAsDataURL(file);
  };

  const barcodeSearch = async (barcodeValue: string) => {
    try {
      const data = await getProductByBarcode(barcodeValue);
      setProduct(data);
      setError(null);
    } catch (error) {
      setError("ไม่พบสินค้าในระบบ");
      setProduct(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (barcode.trim() !== "") {
      barcodeSearch(barcode);
    }
  };

  return (
    <div className="display">
      <div className="barcode-uploader-container">
        <h1 className="title">📸 อัปโหลดรูปภาพหรือกรอกบาร์โค้ดเพื่อค้นหาสินค้า</h1>

        {/* ส่วนอัปโหลดรูปภาพ */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="file-input"
        />

        {/* ฟอร์มกรอกบาร์โค้ด */}
        <form onSubmit={handleSubmit} className="barcode-form">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="กรอกบาร์โค้ด..."
            className="text-input"
          />
          <button type="submit" className="search-button">🔍 ค้นหาสินค้า</button>
        </form>

        {error && <p className="error-message">{error}</p>}

        {product && (
          <div className="product-details">
            <h2>📦 รายละเอียดสินค้า</h2>
            <p><strong>รูปภาพสินค้า:</strong> {product.imageUrl}</p>

            <p><strong>ชื่อสินค้า:</strong> {product.name}</p>
            <p><strong>ราคา:</strong> {product.price} บาท</p>
            <p><strong>รายละเอียด:</strong> {product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeUploader;

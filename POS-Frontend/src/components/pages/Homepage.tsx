import React from "react";
import "../../styles/page/HomePage.css"; // นำเข้าไฟล์ CSS

const HomePage: React.FC = () => {
  return (
    <div className="home-container">
      {/* ส่วนข้อความต้อนรับ */}
      <div className="text-section">
        <h1 className="welcome-title">ยินดีต้อนรับสู่ระบบ POS</h1>
        <p className="description">
          ระบบที่ช่วยให้การขายของคุณเป็นเรื่องง่ายและสะดวกยิ่งขึ้น
          รองรับการจัดการสินค้า รายงานยอดขาย และสต็อกสินค้าในที่เดียว!
        </p>

        {/* จุดเด่นของระบบ */}
        <div className="features">
          <div className="feature-item">
            ✅ <strong>จัดการสินค้า:</strong> เพิ่ม ลบ แก้ไขข้อมูลสินค้าได้ง่าย
          </div>
          <div className="feature-item">
            📊 <strong>รายงานยอดขาย:</strong> ดูสรุปยอดขายแบบเรียลไทม์
          </div>
          <div className="feature-item">
            📦 <strong>ระบบสต็อก:</strong> ควบคุมปริมาณสินค้าให้อยู่ในระดับที่เหมาะสม
          </div>
          <div className="feature-item">
            💳 <strong>รองรับการชำระเงิน:</strong> รับชำระเงินหลายช่องทาง
          </div>
        </div>
      </div>

      {/* ส่วนรูปภาพประกอบ */}
      <div className="image-section">
        <img
          className="pos-image"
          src="https://res.cloudinary.com/dboau6axv/image/upload/v1738153705/pos_ozpgmv.jpg"
          alt="POS System"
        />
      </div>
    </div>
  );
};

export default HomePage;

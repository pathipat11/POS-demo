import React, { useRef } from "react";
import ReactDOM from "react-dom";
import { QRCodeCanvas } from "qrcode.react";
import "../../styles/purchaseOrder/PurchaseOrderPrintModal.css";

const COMPANY_INFO = {
    name: "EazyPOS Store Co., Ltd.",
    address: "123 ถนนสุขุมวิท เขตวัฒนา กรุงเทพฯ 10110",
    phone: "โทร. 02-123-4567",
    taxId: "0105551234567",
    logo: "/images/company-logo.png",
};

const PurchaseOrderPrintModal = ({ po, onClose }: any) => {
    const qrRef = useRef<HTMLCanvasElement>(null);

    const totalAmount = po.items.reduce(
        (sum: number, i: any) => sum + i.costPrice * i.quantity,
        0
    );

    // ✅ เปิดหน้าใหม่และฝัง QR code เป็น base64
    const handlePrint = () => {
        const qrDataUrl = qrRef.current?.toDataURL("image/png") || "";

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        printWindow.document.write(`
        <html>
            <head>
                <title>ใบสั่งซื้อ ${po.purchaseOrderNumber}</title>
                <style>
                    body { font-family: 'TH Sarabun New', sans-serif; margin: 40px; color: #222; }
                    .header { display: flex; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .header img { width: 100px; margin-right: 15px; }
                    .company { line-height: 1.4; }
                    h1.title { text-align: center; font-size: 24px; margin: 20px 0; text-decoration: underline; }
                    .info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 16px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #333; padding: 8px; text-align: center; font-size: 15px; }
                    th { background: #f4f4f4; }
                    .total { text-align: right; margin-top: 10px; font-weight: bold; font-size: 16px; }
                    .footer { display: flex; justify-content: space-between; margin-top: 50px; align-items: flex-start; }
                    .signature { width: 30%; text-align: center; }
                    .qr { text-align: center; width: 25%; }
                    .qr img { width: 90px; height: 90px; }
                    @page { size: A4; margin: 25mm; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${COMPANY_INFO.logo}" alt="logo" />
                    <div class="company">
                        <h2>${COMPANY_INFO.name}</h2>
                        <p>${COMPANY_INFO.address}</p>
                        <p>${COMPANY_INFO.phone}</p>
                        <p>เลขประจำตัวผู้เสียภาษี ${COMPANY_INFO.taxId}</p>
                    </div>
                </div>

                <h1 class="title">ใบสั่งซื้อสินค้า (PURCHASE ORDER)</h1>

                <div class="info">
                    <div>
                        <p><b>เลขที่ใบสั่งซื้อ:</b> ${po.purchaseOrderNumber}</p>
                        <p><b>วันที่:</b> ${new Date(po.orderDate).toLocaleDateString("th-TH")}</p>
                        <p><b>สถานะ:</b> ${po.status}</p>
                    </div>
                    <div>
                        <p><b>ผู้จัดส่ง:</b> ${po.supplierCompany}</p>
                        <p><b>คลังสินค้า:</b> ${po.location?.name || "-"}</p>
                        <p><b>เลขที่ใบกำกับภาษี:</b> ${po.invoiceNumber || "-"}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>ชื่อสินค้า</th>
                            <th>Barcode</th>
                            <th>จำนวน</th>
                            <th>ราคาทุน/หน่วย</th>
                            <th>ราคารวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${po.items
                .map(
                    (item: any, i: number) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${item.productName}</td>
                                <td>${item.barcode}</td>
                                <td>${item.quantity}</td>
                                <td>${item.costPrice.toLocaleString()}</td>
                                <td>${(item.quantity * item.costPrice).toLocaleString()}</td>
                            </tr>`
                )
                .join("")}
                    </tbody>
                </table>

                <div class="total">
                    รวมทั้งสิ้น: ${totalAmount.toLocaleString()} บาท
                </div>

                <div class="footer">
                    <div class="signature">
                        <p>ลงชื่อ .............................................</p>
                        <p>(ผู้สั่งซื้อ)</p>
                        <p>วันที่ ........../........../..........</p>
                    </div>
                    <div class="signature">
                        <p>ลงชื่อ .............................................</p>
                        <p>(ผู้จัดส่ง)</p>
                        <p>วันที่ ........../........../..........</p>
                    </div>
                    <div class="qr">
                        <img src="${qrDataUrl}" />
                        <p>สแกนเพื่อดูใบสั่งซื้อ</p>
                    </div>
                </div>
            </body>
        </html>
        `);

        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
    };

    return ReactDOM.createPortal(
        <div className="po-print-modal-overlay">
            <div className="po-print-modal">
                <div className="po-print-scope">
                    {/* ✅ QR สำหรับแปลง base64 (ซ่อนไว้) */}
                    <div style={{ display: "none" }}>
                        <QRCodeCanvas
                            ref={qrRef}
                            value={`${window.location.origin}/purchase-order/${po._id}`}
                            size={90}
                            includeMargin
                        />
                    </div>

                    <div className="company-header">
                        <div className="company-left">
                            <img src={COMPANY_INFO.logo} alt="logo" className="company-logo" />
                        </div>
                        <div className="company-right">
                            <h1 className="company-name">{COMPANY_INFO.name}</h1>
                            <p>{COMPANY_INFO.address}</p>
                            <p>{COMPANY_INFO.phone}</p>
                            <p>เลขประจำตัวผู้เสียภาษี {COMPANY_INFO.taxId}</p>
                        </div>
                    </div>

                    <h2 className="po-title">ใบสั่งซื้อสินค้า (PURCHASE ORDER)</h2>

                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ชื่อสินค้า</th>
                                <th>Barcode</th>
                                <th>จำนวน</th>
                                <th>ราคาทุน/หน่วย</th>
                                <th>ราคารวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.items.map((item: any, i: number) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{item.productName}</td>
                                    <td>{item.barcode}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.costPrice?.toLocaleString()}</td>
                                    <td>{(item.quantity * item.costPrice).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="total-section">
                        รวมทั้งสิ้น: <strong>{totalAmount.toLocaleString()} บาท</strong>
                    </div>

                    <div className="print-modal-buttons no-print">
                        <button className="btn-print-now" onClick={handlePrint}>
                            🖨️ พิมพ์เอกสาร
                        </button>
                        <button className="btn-close" onClick={onClose}>
                            ปิด
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PurchaseOrderPrintModal;

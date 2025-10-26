import React, { useState } from "react";
import ReactDOM from "react-dom";
import "../../styles/purchaseOrder/PurchaseOrderItemsTable.css";
import "../../styles/qc/QCDetailModal.css";
import { getQCByBatch } from "../../api/purchaseOrder/qcApi";

interface Props {
    items: any[];
    stockLots: any[];
    onReturnItem?: (item: any) => void;
    loadingItem?: string | null;
}

const PurchaseOrderItemsTable: React.FC<Props> = ({
    items,
    stockLots,
    onReturnItem,
    loadingItem,
}) => {
    const [showModal, setShowModal] = useState(false);
    const [qcRecords, setQcRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const token = localStorage.getItem("token") || "";

    const getLotInfo = (batchNumber: string) =>
        stockLots.find((lot) => lot.batchNumber === batchNumber);

    const getQCStatus = (batchNumber: string) => {
        const lot = getLotInfo(batchNumber);
        return lot?.qcStatus || "รอตรวจสอบ";
    };

    const getFailedQty = (batchNumber: string) => {
        const lot = getLotInfo(batchNumber);
        return lot?.failedQuantity ?? null;
    };

    const getExpiryDate = (batchNumber: string) => {
        const lot = getLotInfo(batchNumber);
        return lot?.expiryDate
            ? new Date(lot.expiryDate).toLocaleDateString("th-TH")
            : "-";
    };

    const getQCClass = (status: string) => {
        switch (status) {
            case "ผ่าน":
                return "qc-pass";
            case "ไม่ผ่าน":
                return "qc-fail";
            case "ผ่านบางส่วน":
            case "ตรวจบางส่วน":
                return "qc-partial";
            default:
                return "qc-pending";
        }
    };

    const handleRowClick = async (item: any) => {
        const batchNumber = item.batchNumber;
        setSelectedBatch(batchNumber);
        setSelectedItem(item);
        setLoading(true);
        setShowModal(true);

        try {
            const res = await getQCByBatch(batchNumber, token);
            setQcRecords(res.success ? res.data : []);
        } catch (err) {
            console.error("❌ Error fetching QC:", err);
            setQcRecords([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="po-items">
            <h4>📋 รายการสินค้า</h4>

            {/* ===== Scrollable Table ===== */}
            <div className="po-items-table-wrapper">
                <div className="po-items-scroll">
                    <table className="po-items-table">
                        <thead>
                            <tr>
                                <th>สินค้า</th>
                                <th>Barcode</th>
                                <th>จำนวน</th>
                                <th>จำนวนไม่ผ่าน QC</th>
                                <th>ราคาต่อหน่วย</th>
                                <th>ราคารวม</th>
                                <th>เลขล็อต</th>
                                <th>สถานะ QC</th>
                                <th>คืนสินค้า</th>
                                <th>วันหมดอายุ</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((item, index) => {
                                const total = item.costPrice * item.quantity;
                                const qcStatus = getQCStatus(item.batchNumber);
                                const qcClass = getQCClass(qcStatus);
                                const isReturned = item.isReturned === true;
                                const failedQty = getFailedQty(item.batchNumber);
                                const displayFailed =
                                    failedQty !== null && failedQty > 0
                                        ? `${failedQty} / ${item.quantity}`
                                        : qcStatus === "ไม่ผ่าน"
                                            ? `${item.quantity} / ${item.quantity}`
                                            : "-";

                                return (
                                    <tr
                                        key={index}
                                        className="po-row"
                                        onClick={() => handleRowClick(item)}
                                    >
                                        <td>{item.productName}</td>
                                        <td>{item.barcode || "-"}</td>
                                        <td>{item.quantity}</td>
                                        <td className="qc-failed-cell">
                                            {displayFailed !== "-" ? (
                                                <span className="failed-highlight">{displayFailed}</span>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td>{item.costPrice.toLocaleString()}</td>
                                        <td className="po-total-cell">
                                            {total.toLocaleString()} ฿
                                        </td>
                                        <td>{item.batchNumber || "-"}</td>
                                        <td>
                                            <span className={`qc-status ${qcClass}`}>{qcStatus}</span>
                                        </td>
                                        <td>
                                            {qcStatus === "ไม่ผ่าน" || qcStatus === "ผ่านบางส่วน" ? (
                                                isReturned ? (
                                                    <button className="return-btn-returned" disabled>
                                                        คืนแล้ว
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={`return-btn ${loadingItem === item._id ? "loading" : ""
                                                            }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onReturnItem?.(item);
                                                        }}
                                                    >
                                                        {loadingItem === item._id
                                                            ? "⏳ กำลังคืน..."
                                                            : "คืนสินค้า"}
                                                    </button>
                                                )
                                            ) : (
                                                <span className="return-disabled">-</span>
                                            )}
                                        </td>
                                        <td>{getExpiryDate(item.batchNumber)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== Modal แสดงข้อมูล QC ===== */}
            {showModal &&
                ReactDOM.createPortal(
                    <div
                        className="qc-detail-modal-overlay"
                        onClick={() => setShowModal(false)}
                    >
                        <div
                            className="qc-detail-modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="qc-detail-title">
                                รายละเอียด QC — {selectedItem?.productName} ({selectedBatch})
                            </h3>

                            {loading ? (
                                <p className="qc-loading-text">⏳ กำลังโหลดข้อมูล...</p>
                            ) : qcRecords.length > 0 ? (
                                <>
                                    <table className="qc-detail-table">
                                        <thead>
                                            <tr>
                                                <th>ผู้ตรวจสอบ</th>
                                                <th>สถานะ QC</th>
                                                <th>จำนวนทั้งหมด</th>
                                                <th>จำนวนไม่ผ่าน</th>
                                                <th>หมายเหตุ</th>
                                                <th>วันที่ตรวจ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {qcRecords.map((qc, idx) => (
                                                <tr key={idx}>
                                                    <td>{qc.userId?.username || "-"}</td>
                                                    <td>{qc.status}</td>
                                                    <td>{qc.totalQuantity ?? "-"}</td>
                                                    <td>{qc.failedQuantity ?? 0}</td>
                                                    <td>{qc.remarks || "-"}</td>
                                                    <td>
                                                        {qc.inspectionDate
                                                            ? new Date(
                                                                qc.inspectionDate
                                                            ).toLocaleDateString("th-TH")
                                                            : "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* ✅ รูปภาพแนบ */}
                                    <div className="qc-attachments-section">
                                        <h4>📷 รูปภาพแนบจากการตรวจ QC</h4>
                                        {qcRecords.some((qc) => qc.attachments?.length > 0) ? (
                                            <div className="qc-attachments-grid">
                                                {qcRecords.flatMap((qc, idx) =>
                                                    (qc.attachments || []).map(
                                                        (imgUrl: string, i: number) => (
                                                            <img
                                                                key={`${idx}-${i}`}
                                                                src={imgUrl}
                                                                alt={`QC Attachment ${i + 1}`}
                                                                className="qc-thumbnail"
                                                                onClick={() => setPreviewImage(imgUrl)}
                                                            />
                                                        )
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <p className="qc-no-attachments">ไม่มีรูปแนบ</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p className="qc-no-data-text">ไม่พบข้อมูล QC สำหรับล็อตนี้</p>
                            )}

                            <button
                                className="qc-modal-close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                ปิด
                            </button>
                        </div>

                        {/* ✅ Preview รูปแบบเต็ม */}
                        {previewImage && (
                            <div
                                className="qc-image-preview-overlay"
                                onClick={() => setPreviewImage(null)}
                            >
                                <img
                                    src={previewImage}
                                    alt="Full Preview"
                                    className="qc-image-preview"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    className="qc-image-preview-close"
                                    onClick={() => setPreviewImage(null)}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default PurchaseOrderItemsTable;

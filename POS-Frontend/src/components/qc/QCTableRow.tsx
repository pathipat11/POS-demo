import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faUpload, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";

interface QCTableRowProps {
    item: any;
    qc: any;
    disabled: boolean;
    files: Record<string, File[]>;
    setFiles: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
    qcData: Record<string, any>;
    setQcData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    saving: boolean;
    isFinalized: boolean;
    handleSubmitQC: (item: any) => Promise<void>;
    rowLoading?: string | null;
}

const QCTableRow: React.FC<QCTableRowProps> = ({
    item,
    qc,
    disabled,
    files,
    setFiles,
    qcData,
    setQcData,
    saving,
    isFinalized,
    handleSubmitQC,
    rowLoading,
}) => {
    const batchNumber = item.batchNumber;

    const normalizedQC = {
        ...qc,
        status: qc?.status || "รอตรวจสอบ",
        remarks: qc?.remarks || "",
        expiryDate: qc?.expiryDate
            ? qc.expiryDate.slice(0, 10)
            : item.expiryDate
                ? item.expiryDate.slice(0, 10)
                : "",
        failedQuantity: qc?.failedQuantity ?? 0,
    };

    // ✅ ล็อกเฉพาะเมื่อ backend มี _id แล้ว (แปลว่าบันทึกจริงแล้ว)
    const isLocked = Boolean(normalizedQC._id);

    const handleChange = (field: string, value: any) => {
        // ❗ยกเว้น expiryDate สำหรับ “ผ่านบางส่วน” ให้แก้ได้
        if (isLocked && !(field === "expiryDate" && normalizedQC.status === "ผ่านบางส่วน")) return;
        setQcData((prev) => ({
            ...prev,
            [batchNumber]: { ...prev[batchNumber], [field]: value },
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLocked) return;
        setFiles((prev) => ({
            ...prev,
            [batchNumber]: Array.from(e.target.files || []),
        }));
    };

    const expiryDisabled =
        (normalizedQC.status !== "ผ่าน" && normalizedQC.status !== "ผ่านบางส่วน") ||
        disabled ||
        isFinalized;

    const failedDisabled =
        isLocked ||
        (normalizedQC.status !== "ผ่านบางส่วน" && normalizedQC.status !== "ไม่ผ่าน") ||
        disabled ||
        isFinalized;

    const canSave = () => {
        if (isLocked || disabled || isFinalized || saving) return false;
        const total = item.quantity || 0;
        if (normalizedQC.status === "รอตรวจสอบ") return false;
        if (normalizedQC.status === "ผ่าน" && !normalizedQC.expiryDate) return false;
        if (
            normalizedQC.status === "ผ่านบางส่วน" &&
            (!normalizedQC.failedQuantity || normalizedQC.failedQuantity >= total)
        )
            return false;
        return true;
    };

    const rowClass =
        normalizedQC.status === "ผ่าน"
            ? "qc-row qc-pass"
            : normalizedQC.status === "ไม่ผ่าน"
                ? "qc-row qc-fail"
                : normalizedQC.status === "ผ่านบางส่วน"
                    ? "qc-row qc-partial"
                    : "qc-row qc-pending";

    return (
        <tr className={`${rowClass} ${isLocked ? "locked" : ""}`}>
            <td>{item.productName}</td>
            <td>{batchNumber}</td>

            {/* ✅ วันหมดอายุ */}
            <td>
                <div className="qc-expiry-field">
                    <FontAwesomeIcon icon={faCalendarAlt} className="qc-expiry-icon" />
                    <input
                        type="date"
                        disabled={expiryDisabled}
                        value={normalizedQC.expiryDate || ""}
                        onChange={(e) => handleChange("expiryDate", e.target.value)}
                        className={`qc-expiry-input ${!expiryDisabled && !normalizedQC.expiryDate ? "qc-required" : ""
                            }`}
                    />
                </div>
            </td>

            {/* ✅ สถานะ QC */}
            <td>
                <select
                    disabled={isLocked || disabled || isFinalized}
                    value={normalizedQC.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className={`qc-status-select ${normalizedQC.status}`}
                >
                    <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                    <option value="ผ่าน">ผ่าน</option>
                    <option value="ผ่านบางส่วน">ผ่านบางส่วน</option>
                    <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                </select>
            </td>

            <td>
                <span className="qc-total-text">{item.quantity}</span>
            </td>

            <td>
                <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    disabled={failedDisabled}
                    value={normalizedQC.failedQuantity}
                    onChange={(e) => handleChange("failedQuantity", e.target.value)}
                    className={`qc-failed-input ${!failedDisabled && normalizedQC.failedQuantity > 0 ? "qc-input-active" : ""
                        }`}
                />
            </td>

            <td>
                <input
                    type="text"
                    disabled={isLocked || disabled || isFinalized}
                    placeholder="หมายเหตุ..."
                    value={normalizedQC.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    className="qc-remark-input"
                />
            </td>

            <td>
                <label
                    className={`qc-upload-label ${isLocked || disabled || isFinalized ? "disabled" : ""
                        }`}
                >
                    <FontAwesomeIcon icon={faUpload} /> เลือกรูป
                    <input
                        type="file"
                        multiple
                        hidden
                        disabled={isLocked || disabled || isFinalized}
                        onChange={handleFileUpload}
                    />
                </label>
                {files[batchNumber]?.length > 0 && (
                    <p className="qc-file-count">📎 {files[batchNumber].length} ไฟล์</p>
                )}
            </td>

            <td>
                <button
                    className={`qc-save-btn ${isLocked
                            ? "saved"
                            : rowLoading === batchNumber
                                ? "disabled"
                                : canSave()
                                    ? "active"
                                    : "disabled"
                        }`}
                    disabled={
                        isLocked ||
                        rowLoading === batchNumber ||
                        !canSave() ||
                        normalizedQC.status === "รอตรวจสอบ"
                    }
                    onClick={() => {
                        if (!isLocked && rowLoading !== batchNumber) handleSubmitQC(item);
                    }}
                >
                    {isLocked ? (
                        <>
                            <FontAwesomeIcon icon={faCheck} /> บันทึกแล้ว
                        </>
                    ) : rowLoading === batchNumber ? (
                        <>
                            <span className="qc-spinner" /> กำลังบันทึก...
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faCheck} /> บันทึก
                        </>
                    )}
                </button>
            </td>
        </tr>
    );
};

export default QCTableRow;

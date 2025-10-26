import React, { useState, useMemo } from "react";
import {
    confirmPurchaseOrder,
    cancelPurchaseOrder,
    returnPurchaseOrder,
} from "../../api/purchaseOrder/purchaseOrderApi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVial, faPrint, faUndoAlt, faUndo } from "@fortawesome/free-solid-svg-icons";
import PurchaseOrderPrintModal from "./PurchaseOrderPrintModal";
import "../../styles/purchaseOrder/PurchaseOrderActions.css";

interface Props {
    po: any;
    navigate: any;
    setPopup: (popup: any) => void;
    onActionComplete: () => void;
}

const PurchaseOrderActions: React.FC<Props> = ({
    po,
    navigate,
    setPopup,
    onActionComplete,
}) => {
    const [loading, setLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const openConfirmPopup = (message: string, onConfirm: () => void) => {
        setPopup({ type: "confirm", message, onConfirm });
    };

    const canPrint =
        po.status === "รอดำเนินการ" ||
        po.status === "รอตรวจสอบ QC" ||
        po.status === "รอตรวจรับสินค้า" ||
        (po.status === "ได้รับสินค้าแล้ว" && po.qcStatus === "ผ่าน");

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await confirmPurchaseOrder(po._id, token);
            if (res.success) {
                setPopup({
                    type: "success",
                    message: "✅ ยืนยันรับสินค้าเรียบร้อยแล้ว",
                    onConfirm: () => navigate(`/qc/${po._id}`),
                });
                onActionComplete();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReturnAll = async () => {
        const token = localStorage.getItem("token") || "";
        const res = await returnPurchaseOrder(po._id, token);
        setPopup({ type: res.success ? "success" : "error", message: res.message });
        onActionComplete();
    };

    const handleCancel = async () => {
        const token = localStorage.getItem("token") || "";
        const res = await cancelPurchaseOrder(po._id, token);
        setPopup({ type: res.success ? "success" : "error", message: res.message });
        onActionComplete();
    };

    // ✅ สรุปสถานะ QC และการคืน
    const qcStatusSummary = useMemo(() => {
        if (!po.stockLots || po.stockLots.length === 0)
            return { hasPass: false, hasFail: false, hasPending: false, hasReturnPending: false };

        let hasPass = false;
        let hasFail = false;
        let hasPending = false;
        let hasReturnPending = false;

        po.stockLots.forEach((lot: any) => {
            const qc = lot.qcStatus || "รอตรวจสอบ";
            const ret = lot.returnStatus || null;

            if (qc === "ผ่าน") hasPass = true;
            else if (qc.includes("ไม่ผ่าน") || qc === "ผ่านบางส่วน") hasFail = true;
            else hasPending = true;

            if (ret === "รอคืนสินค้า" || ret === "ยังไม่คืน") hasReturnPending = true;
        });

        return { hasPass, hasFail, hasPending, hasReturnPending };
    }, [po.stockLots]);

    // ✅ ปุ่มคืนบางส่วน (ของเดิม)
    const showReturnButtonPartial =
        qcStatusSummary.hasReturnPending &&
        !["ไม่ผ่าน QC - คืนสินค้าแล้ว", "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว"].includes(
            po.status
        );

    // ✅ ปุ่มคืนทั้งใบ (ใหม่)
    const showReturnAllButton =
        (po.qcStatus === "ไม่ผ่าน" || po.qcStatus === "ผ่านบางส่วน") &&
        !["ไม่ผ่าน QC - คืนสินค้าแล้ว", "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว"].includes(
            po.status
        ) &&
        qcStatusSummary.hasFail; // ต้องมีของไม่ผ่านจึงคืนทั้งใบได้

    const showGoToQCButton =
        qcStatusSummary.hasPending ||
        (!qcStatusSummary.hasFail && !qcStatusSummary.hasPending);

    const allPassed =
        qcStatusSummary.hasPass &&
        !qcStatusSummary.hasFail &&
        !qcStatusSummary.hasPending;

    return (
        <div className="po-actions">
            {/* 🚫 ถ้ายกเลิกแล้ว แสดงข้อความแทนทุกปุ่ม */}
            {po.status === "ยกเลิก" ? (
                <p className="po-cancelled-text">❌ ใบสั่งซื้อนี้ถูกยกเลิกแล้ว</p>
            ) : (
                <>
                    {/* ✅ ปุ่มรับสินค้า */}
                    {po.status === "รอดำเนินการ" && (
                        <>
                            <button
                                className="po-confirm-button"
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                ยืนยันรับสินค้า
                            </button>
                            <button
                                className="po-cancel-button"
                                onClick={() =>
                                    openConfirmPopup("ยกเลิกใบสั่งซื้อนี้หรือไม่?", handleCancel)
                                }
                            >
                                ยกเลิก
                            </button>
                        </>
                    )}

                    {/* ✅ ปุ่มคืนสินค้าทั้งใบ */}
                    {showReturnAllButton && (
                        <div
                            className="tooltip-container"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <button
                                className="po-return-button"
                                onClick={() =>
                                    openConfirmPopup("คืนสินค้า PO นี้หรือไม่?", handleReturnAll)
                                }
                            >
                                <FontAwesomeIcon icon={faUndoAlt} /> คืนสินค้าที่ไม่ผ่าน QC
                            </button>
                            {showTooltip && (
                                <div className="tooltip-text">
                                    💡 จะคืนเฉพาะสินค้าที่ “ยังไม่คืน” หรือ “รอคืนสินค้า” เท่านั้น
                                </div>
                            )}
                        </div>
                    )}

                    {/* ✅ ปุ่มไปตรวจ QC */}
                    {po.status !== "รอดำเนินการ" &&
                        showGoToQCButton &&
                        !allPassed && (
                            <button
                                className="qc-go-button"
                                onClick={() => navigate(`/qc/${po._id}`)}
                            >
                                <FontAwesomeIcon icon={faVial} />{" "}
                                {po.qcStatus === "ผ่านบางส่วน" || po.qcStatus === "ตรวจบางส่วน"
                                    ? "ดำเนินการตรวจ QC ต่อ"
                                    : "ไปตรวจ QC"}
                            </button>
                        )}

                    {/* ✅ ผ่านทั้งหมดแล้ว */}
                    {allPassed && (
                        <p className="qc-complete-text">✅ สินค้าทั้งหมดผ่านการตรวจ QC แล้ว</p>
                    )}

                    {/* ✅ ปุ่มพิมพ์ใบสั่งซื้อ */}
                    {canPrint && (
                        <button
                            className="btn-print"
                            onClick={() => setShowPrintModal(true)}
                        >
                            <FontAwesomeIcon icon={faPrint} /> พิมพ์ใบสั่งซื้อ
                        </button>
                    )}

                    {showPrintModal && (
                        <PurchaseOrderPrintModal
                            po={po}
                            onClose={() => setShowPrintModal(false)}
                        />
                    )}
                </>
            )}
        </div>
    );

};

export default PurchaseOrderActions;

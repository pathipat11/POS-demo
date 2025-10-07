import React, { useState, useEffect } from "react";
import "../../styles/payment/Checkout.css";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faCartShopping,
  faMoneyBill,
  faQrcode,
  faCreditCard,
} from "@fortawesome/free-solid-svg-icons";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";

interface CheckoutProps {
  cart: { barcode: string; name: string; price: number; quantity: number }[];
  totalPrice: number;
  onClose: () => void;
  onConfirmPayment: (method: string, amountReceived?: number) => void;
  checkout: (
    amountReceived: number,
    selectedPaymentMethod: "เงินสด" | "โอนเงิน" | "บัตรเครดิต" | "QR Code"
  ) => Promise<void>;
}

const Checkout: React.FC<CheckoutProps> = ({
  cart,
  totalPrice,
  onClose,
  onConfirmPayment,
  checkout,
}) => {
  const [showNumpad, setShowNumpad] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [change, setChange] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCredit, setShowCredit] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [phoneNumber] = useState("0633133099");
  const navigate = useNavigate();

  // คำนวณยอดรวมใหม่เมื่อ cart เปลี่ยน
  useEffect(() => {
    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    setChange(null);
    setCashInput("");
  }, [cart]);

  // สร้าง QR Code สำหรับ PromptPay
  useEffect(() => {
    const qr = generatePayload(phoneNumber, { amount: totalPrice });
    setQrCode(qr);
  }, [totalPrice, phoneNumber]);

  const handleCashPayment = () => {
    const cashAmount = parseFloat(cashInput);
    if (isNaN(cashAmount)) {
      setError("กรุณาใส่จำนวนเงินให้ถูกต้อง");
      setChange(null);
    } else {
      setChange(cashAmount - totalPrice);
      setError(null);
    }
  };

  // 💵 เงินสด
  const confirmCashPayment = async () => {
    const cashAmount = parseFloat(cashInput);
    if (change !== null && change >= 0) {
      await checkout(cashAmount, "เงินสด");
      onClose(); // ✅ แจ้ง ProductList ให้แสดง popup
    }
  };

  // 📱 QR Code
  const confirmQRPayment = async () => {
    await checkout(totalPrice, "QR Code");
    onClose();
  };

  // 💳 บัตรเครดิต
  const confirmCreditPayment = async () => {
    if (selectedCard) {
      await checkout(totalPrice, "บัตรเครดิต");
      onClose();
    }
  };

  return (
    <div className="display">
      <div className="checkout-modal">
        <div className="checkout-content">
          {/* 🧾 ด้านซ้าย: รายการสินค้า */}
          <div className="checkout-left">
            <div className="checkout-items">
              {cart.map((item) => (
                <div key={item.barcode} className="checkout-item">
                  <span className="checkout-item-name">{item.name}</span>
                  <span className="checkout-item-price">
                    ราคา {item.price.toLocaleString()} บาท
                  </span>
                  <span className="checkout-item-quantity">
                    x {item.quantity} รายการ
                  </span>
                </div>
              ))}
            </div>

            <div className="checkout-total">
              <span className="checkout-total-label">ยอดรวม:</span>
              <span className="checkout-total-price">
                {totalPrice.toLocaleString()} ฿
              </span>
            </div>

            {/* ข้อความแจ้งเงินทอน */}
            {change !== null && change >= 0 && (
              <p className="checkout-change">✅ จำนวนเงินถูกต้อง</p>
            )}
            {change !== null && change < 0 && (
              <p className="checkout-error">❌ จำนวนเงินไม่เพียงพอ</p>
            )}
          </div>

          {/* 💳 ด้านขวา: ปุ่มเลือกวิธีชำระเงิน */}
          <div className="checkout-right">
            <button onClick={onClose} className="checkout-close-btn">
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <div className="checkout-payment-buttons">
              <button
                className="checkout-cash-btn"
                onClick={() => {
                  setShowNumpad(true);
                  setShowQR(false);
                  setShowCredit(false);
                }}
              >
                <FontAwesomeIcon icon={faMoneyBill} /> เงินสด
              </button>

              <button
                className="checkout-qr-btn"
                onClick={() => {
                  setShowQR(true);
                  setShowNumpad(false);
                  setShowCredit(false);
                }}
              >
                <FontAwesomeIcon icon={faQrcode} /> QR Code
              </button>

              <button
                className="checkout-credit-btn"
                onClick={() => {
                  setShowCredit(true);
                  setShowNumpad(false);
                  setShowQR(false);
                }}
              >
                <FontAwesomeIcon icon={faCreditCard} /> บัตรเครดิต
              </button>
            </div>

            {/* 🧮 Number Pad สำหรับเงินสด */}
            {showNumpad && (
              <div className="checkout-numpad">
                <h3 className="checkout-numpad-title">กรุณาใส่จำนวนเงิน</h3>
                <input
                  type="text"
                  className="checkout-numpad-input"
                  value={
                    Number(cashInput)
                      ? Number(cashInput).toLocaleString()
                      : ""
                  }
                  readOnly
                />

                <div className="numpad-buttons">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                    <button
                      key={num}
                      className="numpad-btn"
                      onClick={() => {
                        setCashInput(cashInput + num);
                        setError(null);
                      }}
                    >
                      {num}
                    </button>
                  ))}

                  {/* ลบทีละตัว */}
                  <button
                    className="numpad-btn backspace-btn"
                    onClick={() => {
                      setCashInput(cashInput.slice(0, -1));
                      setChange(null);
                      setError(null);
                    }}
                  >
                    ⬅
                  </button>

                  {/* ล้างทั้งหมด */}
                  <button
                    className="numpad-btn clear-btn"
                    onClick={() => {
                      setCashInput("");
                      setChange(null);
                      setError(null);
                    }}
                  >
                    AC
                  </button>

                  {/* คำนวณเงินทอน */}
                  <button
                    className="numpad-btn confirm-btn"
                    onClick={handleCashPayment}
                  >
                    ยืนยัน
                  </button>
                </div>

                <button
                  onClick={confirmCashPayment}
                  className="checkout-btn checkout-confirm-btn"
                  disabled={change === null || change < 0}
                >
                  ยืนยันชำระเงิน
                </button>
              </div>
            )}

            {/* 📱 QR Code */}
            {showQR && (
              <div className="qr-code-image">
                <h3 className="qr-title">สแกน QR Code เพื่อชำระเงิน</h3>
                {qrCode && <QRCodeSVG value={qrCode} size={256} />}
                <button onClick={confirmQRPayment} className="qr-confirm-btn">
                  ยืนยันชำระเงิน
                </button>
              </div>
            )}

            {/* 💳 Credit Card */}
            {showCredit && (
              <div className="credit-modal">
                <h3 className="credit-title">เลือกประเภทบัตรเครดิต</h3>
                <div className="credit-options">
                  {["Visa", "Mastercard", "JCB"].map((card) => (
                    <button
                      key={card}
                      className={`credit-option ${selectedCard === card ? "selected" : ""
                        }`}
                      onClick={() => setSelectedCard(card)}
                    >
                      {card}
                    </button>
                  ))}
                </div>
                <button
                  onClick={confirmCreditPayment}
                  className="credit-confirm-btn"
                  disabled={!selectedCard}
                >
                  ยืนยันชำระเงิน
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

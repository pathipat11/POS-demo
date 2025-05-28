import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faSignOutAlt,
  faSignInAlt,
  faUserPlus,
  faCaretDown,
  faBars,
  faTimes,
  faShoppingCart,
  faHome,
  faBox,
  faChartLine,
  faCog,
  faReceipt,
  faHistory,
  faCartPlus,
  faFileInvoice,
  faExchangeAlt,
  faBarcode,
  faHandshake,
  faScroll,
  faExclamationTriangle,
  faClipboardList,

} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getStockData } from "../../api/stock/stock.ts";
import { getProducts } from "../../api/product/productApi.ts";
import LoginPageModal from "../auth/LoginPageModal.tsx";
import RegisterPageModal from "../auth/RegisterPageModal.tsx";
import "../../styles/page/Header.css";
import "../../styles/page/Notification.css";
interface NavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}
interface StockItem {
  barcode: string;
  name: string;
  imageUrl: string;
  quantity: number;
  updatedAt: string;
  location: string;
  status: string;
  supplier: string;
  category: string;
}
const Header: React.FC<NavbarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const [user, setUser] = useState<{
    name: string;
    username: string;
    email: string;
    role: string;
    profileImg: string;
    nameStore: string;
  } | null>(null);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [userdropdown, setUserDropdown] = useState(false);
  const [activeMenu, setActiveMenu] = useState("ยินดีต้อนรับสู่ระบบจัดการสินค้า");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          name: decoded.name,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          nameStore: decoded.nameStore,
          profileImg: decoded.profile_img || "default-avatar.png",
        });
      } catch (error) {
        console.error("Invalid token:", error);
      }
    }
  }, []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // ปิด dropdown ของสินค้า
      if (!target.closest(".item-dropdown")) {
        setOpenDropdown(null);
      }

      // ปิด dropdown ของผู้ใช้
      if (!target.closest(".user-dropdown")) {
        setUserDropdown(false);
      }

      // ปิด dropdown การแจ้งเตือน
      if (!target.closest(".notification-dropdown")) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);



  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("❌ ไม่พบ token");
        return;
      }

      try {
        const stock = await getStockData(token);
        setStockData(stock);
      } catch (err) {
        setErrorMessage("❌ ดึงข้อมูล stock ไม่สำเร็จ");
      }
    };

    fetchData();
  }, []);

  const handleMenuClick = (path: string, menuName: string) => {
    setActiveMenu(menuName);
    navigate(path);
  };
  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };
  const handleUserSettings = () => {
    navigate("/settingProfile");
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  return (
    <>
      {/* ปุ่ม Toggle Sidebar */}
      <button className={`toggleButton ${isSidebarOpen ? "open" : "closed"}`} onClick={toggleSidebar}>
        <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faBars} />
      </button>
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        {/* ส่วนแสดงชื่อร้าน */}
        <div className="sidebar-header">
          <span className="sidebar-logo-text">{user?.nameStore || "EAZYPOS"}</span>
        </div>

        <div className="sidebar-scrollable">
          {/* เมนู */}
          <ul className="navLinks">
            <li className="item-dropdown" onClick={() => toggleDropdown("management")}>
              <FontAwesomeIcon icon={faHome} className="icon" />
              <span className="menu-text-home">หน้าหลัก</span>
              <FontAwesomeIcon icon={faCaretDown} className={`dropdown-icon ${openDropdown === "management" ? "open" : ""}`} />
            </li>

            <ul className={`item-details ${openDropdown === "management" ? "open" : ""} ${isSidebarOpen ? "" : "floating"}`}>
              <li onClick={() => handleMenuClick("/shop", "ซื้อสินค้า")}>
                <FontAwesomeIcon icon={faShoppingCart} className="icon" /> <span className="dropdown-text-buy">ซื้อสินค้า</span>
              </li>
            </ul>
            <li className="item-dropdown" onClick={() => toggleDropdown("reports")}>
              <FontAwesomeIcon icon={faChartLine} className="icon" /> <span className="menu-text-dashboard">รายงาน</span>
              <FontAwesomeIcon icon={faCaretDown} className={`dropdown-icon ${openDropdown === "reports" ? "open" : ""}`} />
            </li>
            <ul className={`item-details ${openDropdown === "reports" ? "open" : ""} ${isSidebarOpen ? "" : "floating"}`}>
              <li onClick={() => handleMenuClick("/reports/sales", "รายงานยอดขาย")}>
                <FontAwesomeIcon icon={faFileInvoice} className="icon" /> <span className="dropdown-text-sale">รายงานยอดขาย</span>
              </li>
              <li onClick={() => handleMenuClick("/reports/stock", "รายงานสินค้าคงเหลือ")}>
                <FontAwesomeIcon icon={faClipboardList} className="icon" /> <span className="dropdown-text-stock">รายงานสินค้าคงเหลือ</span>
              </li>
              <li onClick={() => handleMenuClick("/reports/receipts", "ใบเสร็จ")}>
                <FontAwesomeIcon icon={faReceipt} className="icon" /> <span className="dropdown-text-receipt">ใบเสร็จ</span>
              </li>
              <li onClick={() => handleMenuClick("/reports/salehistory", "ประวัติการขาย")}>
                <FontAwesomeIcon icon={faHistory} className="icon" /> <span className="dropdown-text-historysale">ประวัติการขาย</span>
              </li>
            </ul>

            {/* เมนู: จัดการสินค้า */}
            <li className="item-dropdown" onClick={() => toggleDropdown("products")}>
              <FontAwesomeIcon icon={faBox} className="icon" /> <span className="menu-text-product">จัดการสินค้า</span>
              <FontAwesomeIcon icon={faCaretDown} className={`dropdown-icon ${openDropdown === "products" ? "open" : ""}`} />
            </li>
            <ul className={`item-details ${openDropdown === "products" ? "open" : ""} ${isSidebarOpen ? "" : "floating"}`}>
              <li onClick={() => handleMenuClick("/stocks", "สต็อกสินค้า")}>
                <FontAwesomeIcon icon={faClipboardList} className="icon" /> <span className="dropdown-text-stock">สต็อกสินค้า</span>
              </li>
              <li onClick={() => handleMenuClick("/createOrder", "นำเข้าสินค้าใหม่")}>
                <FontAwesomeIcon icon={faCartPlus} className="icon" /> <span className="dropdown-text-buyproduct">นำเข้าสินค้าใหม่</span>
              </li>
              <li onClick={() => handleMenuClick("/transfer", "โอนสินค้า")}>
                <FontAwesomeIcon icon={faExchangeAlt} className="icon" /> <span className="dropdown-text-tranfer">โอนสินค้า</span>
              </li>
              <li onClick={() => handleMenuClick("/products/scan", "บาร์โค้ด")}>
                <FontAwesomeIcon icon={faBarcode} className="icon" /> <span className="dropdown-text-barcode">บาร์โค้ด</span>
              </li>
              <li onClick={() => handleMenuClick("/debt", "ค้างชำระ")}>
                <FontAwesomeIcon icon={faScroll} className="icon" /> <span className="dropdown-text-debt">ค้างชำระ</span>
              </li>
              <li onClick={() => handleMenuClick("/expired", "สินค้าเหลือน้อย/สินค้าหมด")}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="icon" /> <span className="dropdown-text-expired">สินค้าเหลือน้อย</span>
              </li>
            </ul>
            {/* เมนู: เกี่ยวกับร้านค้า (แสดงเฉพาะถ้าไม่ใช่พนักงาน) */}
            {user?.role !== "employee" && (
              <>
                <li className="item-dropdown" onClick={() => toggleDropdown("setting")}>
                  <FontAwesomeIcon icon={faCog} className="icon" />
                  <span className="menu-text-aboutstore">เกี่ยวกับร้านค้า</span>
                  <FontAwesomeIcon
                    icon={faCaretDown}
                    className={`dropdown-icon ${openDropdown === "setting" ? "open" : ""}`}
                  />
                </li>
                <ul className={`item-details ${openDropdown === "setting" ? "open" : ""} ${isSidebarOpen ? "" : "floating"}`}>
                  <li onClick={() => handleMenuClick("/setting/employee", "ตั้งค่าพนักงาน")}>
                    <FontAwesomeIcon icon={faUserPlus} className="icon" />
                    <span className="dropdown-text-employee">พนักงาน</span>
                  </li>
                  <li onClick={() => handleMenuClick("/suppliers", "ผู้ตลิต")}>
                    <FontAwesomeIcon icon={faHandshake} className="icon" />
                    <span className="dropdown-text-suppliers">ผู้ผลิต</span>
                  </li>
                </ul>

              </>
            )}

          </ul>
        </div>
      </aside>

      {/* Navbar */}
      <nav className="navbar">
        <img
          src="https://res.cloudinary.com/dboau6axv/image/upload/v1738923984/pos_icon_zpyzmj.png"
          alt="Logo"
          className="logo-image"
        />
        {isSidebarOpen && <span className="logo-text">EAZYPOS</span>}

        <div className="navbar-content">
          <div className={`iconName ${isSidebarOpen ? "shifted" : "closed"}`}>
            {activeMenu}
          </div>
          <div className="nav-right">
            {user ? (
              <>
                {/* Dropdown การแจ้งเตือน */}
                <div className="notification-dropdown" onClick={(e) => {
                  setNotificationOpen(!notificationOpen);
                  setUserDropdown(false); // ปิดอีกอัน
                }}>
                  <FontAwesomeIcon icon={faBell} className="icon notification-icon" />
                  {notificationOpen && (
                    <div className="notification-menu">
                      <span className="notification-badge">3</span>
                      <p className="notification-item">🔔 การแจ้งเตือนใหม่</p>
                      <p className="notification-item">📦 สินค้าเหลือน้อย</p>
                    </div>
                  )}
                </div>
                <div className="user-dropdown" onClick={() => {
                  setUserDropdown(!userdropdown);
                  setNotificationOpen(false); // ปิดอีกอัน
                }}>
                  <div className="user-info">
                    <img src={user.profileImg} alt="User" className="avatar" />
                    <div className="user-details">
                      <span className="username">{user?.username || user?.name}</span>
                      <span className="status-online">🟢 กำลังออนไลน์</span>
                    </div>
                    <FontAwesomeIcon icon={faCaretDown} className="icon caret-icon" />
                  </div>

                  {userdropdown && (
                    <div className="dropdown-menu">
                      <p className="user-role">👤 Role: {user.role}</p>
                      {/* เมนูตั้งค่าผู้ใช้ */}
                      <button
                        onClick={() => {
                          handleUserSettings();
                          handleMenuClick("/settingProfile", "ตั้งค่าผู้ใช้");
                        }}
                        className="settings-button"
                      >
                        <FontAwesomeIcon icon={faCog} className="icon settings-icon" /> ตั้งค่าผู้ใช้
                      </button>
                      {/* ปุ่มออกจากระบบ */}
                      <button onClick={handleLogout} className="logout-button">
                        <FontAwesomeIcon icon={faSignOutAlt} className="icon logout-icon" /> ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button onClick={() => setIsLoginModalVisible(true)} className="login-button" name="login">
                  <FontAwesomeIcon icon={faSignInAlt} className="icon" /> <span>เข้าสู่ระบบ</span>
                </button>
                <button onClick={() => setIsRegisterModalVisible(true)} className="register-button" name="register">
                  <FontAwesomeIcon icon={faUserPlus} className="icon" /> <span>สมัครสมาชิก</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>


      {/* Login และ Register Modal */}
      <LoginPageModal isVisible={isLoginModalVisible} onClose={() => setIsLoginModalVisible(false)} />
      <RegisterPageModal isVisible={isRegisterModalVisible} onClose={() => setIsRegisterModalVisible(false)} />
    </>
  );
};

export default Header;

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Government and office logos */}
        <div className="header-logos">
          <img
            src="/government-logo.png"
            alt="Government of Sri Lanka"
            className="government-logo"
          />

          <img
            src="/office_logo.jpg"
            alt="Manmunai West Divisional Secretariat"
            className="office-logo"
          />
        </div>

        {/* Three-language office heading */}
        <div className="heading">
          <h1 className="header-office-name tamil-title">
            மண்முனை மேற்கு பிரதேச செயலகம்
          </h1>

          <h2 className="header-office-name sinhala-title">
            මන්මුනේ බටහිර ප්‍රාදේශීය ලේකම් කාර්යාලය
          </h2>

          <h3 className="header-office-name english-title">
            Manmunai West Divisional Secretariat
          </h3>

          <p className="header-subtitle">
            BENEFICIARY BENEFITS REGISTER
          </p>
        </div>
      </div>
    </header>
  );
}
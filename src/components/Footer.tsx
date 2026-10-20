
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-logos">
          <img
            src="/government-logo.png"
            alt="Government of Sri Lanka"
            className="footer-government-logo"
          />

          <img
            src="/office_logo.jpg"
            alt="Manmunai West Divisional Secretariat"
            className="footer-office-logo"
          />
        </div>

        <div className="footer-content">
          <h3 className="footer-office-name">
            Divisional Secretariat-Manmunai West
          </h3>

          

          <p className="footer-unit">
            Developped by ICT Unit
          </p>

          <p className="footer-copyright">
            © Manmunai West Divisional Secretariat
          </p>
        </div>
      </div>
    </footer>
  );
}
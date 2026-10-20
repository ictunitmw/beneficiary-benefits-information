import { RefreshCw } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import {
  gnDivisions,
  benefitOptions,
} from "../data/gnDivisions";

type Beneficiary = {
  id: number;
  full_name: string;
  nic: string;
  phone: string;
  gn_division: string;
  home_address: string;
  family_members: number;
  benefits: string[];
  livestock: string[];
  other_benefits: string | null;
  received_date: string;
  providing_organization: string;
  created_at: string;
  created_by: string;
};

type Props = {
  refreshKey: number;
};

export default function Dashboard({ refreshKey }: Props) {
  const [records, setRecords] = useState<Beneficiary[]>([]);
  const [gn, setGn] = useState("");
  const [year, setYear] = useState("");
  const [period, setPeriod] = useState("");
  const [benefit, setBenefit] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Reference to the dashboard content exported to PDF.
  const pdfContentRef = useRef<HTMLElement>(null);

  // Load beneficiary records from Supabase.
  useEffect(() => {
    let isActive = true;

    async function loadRecords() {
      setLoading(true);
      setError("");

      try {
        const { data, error: fetchError } = await supabase
          .from("beneficiaries")
          .select("*")
          .order("received_date", { ascending: false });

        if (fetchError) {
          console.error("Supabase fetch error:", fetchError);
          throw fetchError;
        }

        if (isActive) {
          setRecords((data ?? []) as Beneficiary[]);
        }
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to Load Details of Beneficiaries."
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  // Available years.
  const years = useMemo(() => {
    return [
      ...new Set(
        records
          .map((record) => record.received_date)
          .filter(Boolean)
          .map((date) => date.slice(0, 4))
      ),
    ].sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Apply dashboard filters.
  const filtered = useMemo(() => {
    return records.filter((record) => {
      const receivedDate = record.received_date;

      if (!receivedDate) {
        return false;
      }

      const month = Number(receivedDate.slice(5, 7));
      const quarter = Math.ceil(month / 3);
      const half = month <= 6 ? "H1" : "H2";

      const matchesGn =
        !gn || record.gn_division === gn;

      const matchesYear =
        !year || receivedDate.startsWith(year);

      const matchesPeriod =
        !period ||
        (period === "Q1" && quarter === 1) ||
        (period === "Q2" && quarter === 2) ||
        (period === "Q3" && quarter === 3) ||
        (period === "Q4" && quarter === 4) ||
        (period === "H1" && half === "H1") ||
        (period === "H2" && half === "H2");

      const matchesBenefit =
        !benefit ||
        (record.benefits ?? []).includes(benefit);

      return (
        matchesGn &&
        matchesYear &&
        matchesPeriod &&
        matchesBenefit
      );
    });
  }, [records, gn, year, period, benefit]);

  // Summary by GN division.
  const gnSummary = useMemo(() => {
    return gnDivisions.map((name) => ({
      name,
      count: filtered.filter(
        (record) => record.gn_division === name
      ).length,
    }));
  }, [filtered]);

  // Summary by benefit type.
  const benefitSummary = useMemo(() => {
    return benefitOptions.map((name) => ({
      name,
      count: filtered.filter((record) =>
        (record.benefits ?? []).includes(name)
      ).length,
    }));
  }, [filtered]);

  // Total family members in filtered records.
  const totalFamilyMembers = filtered.reduce(
    (sum, record) =>
      sum + (Number(record.family_members) || 0),
    0
  );

  // Reset all filters.
  function resetFilters() {
    setGn("");
    setYear("");
    setPeriod("");
    setBenefit("");
  }

  // Function 1: Print dashboard using browser print dialog.
  function handlePrint() {
    if (
      loading ||
      error ||
      filtered.length === 0 ||
      downloadingPDF
    ) {
      return;
    }

    window.print();
  }

  // Function 2: Capture dashboard and download PDF.
  async function handleDownloadPDF() {
    if (
      loading ||
      error ||
      filtered.length === 0 ||
      downloadingPDF ||
      !pdfContentRef.current
    ) {
      return;
    }

    setDownloadingPDF(true);

    try {
      const element = pdfContentRef.current;

      // Wait for fonts to finish loading.
      if ("fonts" in document) {
        await document.fonts.ready;
      }

      // Capture dashboard content without buttons and filters.
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
        ignoreElements: (el) =>
          el.classList.contains("no-print"),
      });

      // Create an A4 landscape PDF.
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const margin = 8;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      // Calculate the source canvas height for each PDF page.
      const pageCanvasHeight =
        (usableHeight / usableWidth) * canvas.width;

      const pageCount = Math.ceil(
        canvas.height / pageCanvasHeight
      );

      for (let page = 0; page < pageCount; page++) {
        const sourceY = page * pageCanvasHeight;

        const sliceHeight = Math.min(
          pageCanvasHeight,
          canvas.height - sourceY
        );

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sliceHeight);

        const context = pageCanvas.getContext("2d");

        if (!context) {
          throw new Error("Could not create PDF canvas.");
        }

        context.fillStyle = "#FFFFFF";
        context.fillRect(
          0,
          0,
          pageCanvas.width,
          pageCanvas.height
        );

        context.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        if (page > 0) {
          pdf.addPage("a4", "landscape");
        }

        const imageHeight =
          (pageCanvas.height * usableWidth) / canvas.width;

        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          margin,
          margin,
          usableWidth,
          Math.min(imageHeight, usableHeight)
        );
      }

      // Download the PDF.
      const today = new Date().toISOString().slice(0, 10);

      pdf.save(`Beneficiary_Dashboard_${today}.pdf`);
    } catch (err) {
      console.error("Dashboard PDF download failed:", err);

      window.alert(
        "Unable to download PDF. Please try again."
      );
    } finally {
      setDownloadingPDF(false);
    }
  }

  const actionsDisabled =
    loading ||
    Boolean(error) ||
    filtered.length === 0 ||
    downloadingPDF;

  return (
    <section className="page" ref={pdfContentRef}>
      {/* Separate Print and Download PDF buttons. */}
      <div className="page-actions no-print">
        <button
          type="button"
          onClick={handlePrint}
          disabled={actionsDisabled}
        >
          Print
        </button>

        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={actionsDisabled}
        >
          {downloadingPDF
            ? "PDF is preparing..."
            : "Download PDF"}
        </button>
      </div>

      <h2>Dashboard</h2>

      {/* Dashboard filters. */}
      <div className="filters no-print">
        <label>
          கிராமசேவகர் பிரிவு
          <select
            value={gn}
            onChange={(event) => setGn(event.target.value)}
          >
            <option value="">அனைத்துப் பிரிவுகளும்</option>

            {gnDivisions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          ஆண்டு
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="">அனைத்து ஆண்டுகளும்</option>

            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          காலாண்டு / அரையாண்டு
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="">அனைத்துக் காலங்களும்</option>
            <option value="Q1">முதலாம் காலாண்டு (Q1)</option>
            <option value="Q2">இரண்டாம் காலாண்டு (Q2)</option>
            <option value="Q3">மூன்றாம் காலாண்டு (Q3)</option>
            <option value="Q4">நான்காம் காலாண்டு (Q4)</option>
            <option value="H1">முதலாம் அரையாண்டு (H1)</option>
            <option value="H2">இரண்டாம் அரையாண்டு (H2)</option>
          </select>
        </label>

        <label>
          பெற்ற நன்மை
          <select
            value={benefit}
            onChange={(event) => setBenefit(event.target.value)}
          >
            <option value="">அனைத்து நன்மைகளும்</option>

            {benefitOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        
<button
  type="button"
  className="secondary refresh-icon-button"
  onClick={resetFilters}
  title="Reset filters"
  aria-label="Reset filters"
>
  <RefreshCw size={18} />
</button>

      </div>

      {loading && (
        <p role="status">
          விபரங்கள் ஏற்றப்படுகின்றன...
        </p>
      )}

      {error && (
        <p className="error-message" role="alert">
          Dashboard விபரங்களைப் பெற முடியவில்லை: {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {/* Summary cards. */}
          <div className="summary-cards">
            <article className="summary-card">
              <span>பயனாளிப் பதிவுகள்</span>
              <strong>{filtered.length}</strong>
            </article>

            <article className="summary-card">
              <span>குடும்ப உறுப்பினர்கள்</span>
              <strong>{totalFamilyMembers}</strong>
            </article>

            <article className="summary-card">
              <span>தெரிவுசெய்த நன்மை</span>
              <strong>{benefit || "அனைத்தும்"}</strong>
            </article>
          </div>

          {/* GN division summary table. */}
          <h3>கிராமசேவகர் பிரிவு வாரியான சுருக்கம்</h3>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>கிராமசேவகர் பிரிவு</th>
                  <th>பதிவுகளின் எண்ணிக்கை</th>
                </tr>
              </thead>

              <tbody>
                {gnSummary.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Benefit summary table. */}
          <h3>பெற்ற நன்மை வாரியான சுருக்கம்</h3>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>நன்மையின் வகை</th>
                  <th>பதிவுகளின் எண்ணிக்கை</th>
                </tr>
              </thead>

              <tbody>
                {benefitSummary.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

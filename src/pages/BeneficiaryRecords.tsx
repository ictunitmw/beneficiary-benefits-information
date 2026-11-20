import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";

type RecordItem = {
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
  created_by: string | null;
};

type Props = {
  refreshKey: number;
};

export default function BeneficiaryRecords({
  refreshKey,
}: Props) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Reference to the content exported to PDF.
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
          setRecords((data ?? []) as RecordItem[]);
        }
      } catch (err) {
        console.error("Failed to load beneficiary records:", err);

        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : "பயனாளிகளின் பதிவுகளைப் பெற முடியவில்லை."
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

  // Search records.
  const searchText = search.trim().toLocaleLowerCase();

  const filtered = records.filter((record) => {
    if (!searchText) return true;

    const searchableText = [
      record.full_name,
      record.nic,
      record.phone,
      record.gn_division,
      record.home_address,
      ...(record.benefits ?? []),
      ...(record.livestock ?? []),
      record.other_benefits ?? "",
      record.providing_organization ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase();

    return searchableText.includes(searchText);
  });

  // Format date as DD/MM/YYYY.
  function formatDate(dateString: string) {
    if (!dateString) return "-";

    const parts = dateString.split("-");

    if (parts.length !== 3) return dateString;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // Function 1: Print records using the browser print dialog.
  function handlePrint() {
    if (loading || error || filtered.length === 0) return;

    window.print();
  }

  // Function 2: Generate and download PDF directly.
  
  // Function 2: Generate and download PDF directly.
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

      if ("fonts" in document) {
        await document.fonts.ready;
      }

      // Capture the page content without buttons or search controls.
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
        ignoreElements: (el) =>
          el.classList.contains("no-print"),
      });

      // A4 landscape PDF.
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

      // Calculate the image height when fitted to the page width.
      
      // Height of one PDF page, measured in source-canvas pixels.
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

      const today = new Date().toISOString().slice(0, 10);

      pdf.save(`Beneficiary_Records_${today}.pdf`);
    } catch (err) {
      console.error("PDF download failed:", err);

      window.alert(
        "Unable to download PDF. Try again ."
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
      {/* Buttons are excluded from the downloaded PDF. */}
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

      <h2>பயனாளிகளின் பதிவுகள்</h2>

      {/* Search is excluded from the downloaded PDF. */}
      <div className="no-print form-field">
        <label htmlFor="record-search">
          பெயர் / NIC / தொலைபேசி / கிராமசேவகர் பிரிவு மூலம் தேடுக
        </label>

        <input
          id="record-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="தேட வேண்டிய விபரத்தை உள்ளிடுக"
        />
      </div>

      {!loading && !error && (
        <p>
          மொத்தப் பதிவுகள்: {records.length}
          {" | "}
          தேடலில் கிடைத்தவை: {filtered.length}
        </p>
      )}

      {loading && (
        <p role="status">பதிவுகள் ஏற்றப்படுகின்றன...</p>
      )}

      {error && (
        <p className="error-message" role="alert">
          பதிவுகளைப் பெற முடியவில்லை: {error}
        </p>
      )}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>இலக்கம்</th>
                <th>பெயர்</th>
                <th>தே.அ.அ. இல</th>
                <th>தொலைபேசி</th>
                <th>கிராமசேவகர் பிரிவு</th>
                <th>பெற்ற நன்மைகள்</th>
                <th>பெற்ற திகதி</th>
                <th>வழங்கிய நிறுவனம்</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td>{record.full_name}</td>
                  <td>{record.nic}</td>
                  <td>{record.phone}</td>
                  <td>{record.gn_division}</td>

                  <td>
                    {(record.benefits ?? []).join(", ") || "-"}

                    {(record.livestock ?? []).length > 0 &&
                      ` (${record.livestock.join(", ")})`}

                    {record.other_benefits &&
                      ` — ${record.other_benefits}`}
                  </td>

                  
                  <td>{formatDate(record.received_date)}</td>
                  <td>{record.providing_organization || "-"}</td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    பதிவுகள் எதுவும் இல்லை.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


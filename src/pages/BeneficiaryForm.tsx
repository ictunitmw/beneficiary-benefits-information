import { useRef, useState, type FormEvent } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import { gnDivisions, livestockOptions } from "../data/gnDivisions";

type Props = { onSaved: () => void };

type FamilyMember = {
  name: string;
  birthDate: string;
  nic: string;
  gender: string;
  occupation: string;
  relationship: string;
  otherRelationship: string;
};

const BENEFIT_OPTIONS = [
  "வீடு",
  "வீடு திருத்தம்",
  "மலசலகூடவசதி",
  "மின்சாரவசதி",
  "குடிநீர்வசதி",
  "விவசாயம் சார்ந்த நன்மைகள்",
  "வாழ்வாதாரம்-கால்நடை",
  "வாழ்வாதாரம்-மீன்பிடிஉபகரணம்",
  "வாழ்வாதாரம்-சுயதொழில்",
  "ஏனையவை",
];

const WELFARE_OPTIONS = [
  "சமுர்த்தி",
  "அஸ்வெசும (Aswesuma)",
  "முதியோர் உதவித்தொகை",
  "மாற்றுத்திறனாளிகளுக்கான உதவித்தொகை",
  "வேறு உதவித்திட்டம்",
];

const createFamilyMember = (): FamilyMember => ({
  name: "",
  birthDate: "",
  nic: "",
  gender: "",
  occupation: "",
  relationship: "",
  otherRelationship: "",
});

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  if (Number.isNaN(birth.getTime()) || birth > today) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());

  if (!birthdayPassed) age--;
  return age;
}

export default function BeneficiaryForm({ onSaved }: Props) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    createFamilyMember(),
  ]);

  const [phone, setPhone] = useState("");
  const [welfareReceiving, setWelfareReceiving] = useState("");
  const [welfareSchemes, setWelfareSchemes] = useState<string[]>([]);
  const [otherWelfareScheme, setOtherWelfareScheme] = useState("");

  const [gnDivision, setGnDivision] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [familyMemberCount, setFamilyMemberCount] = useState("");

  const [benefits, setBenefits] = useState<string[]>([]);
  const [livestock, setLivestock] = useState<string[]>([]);
  const [agricultureDetails, setAgricultureDetails] = useState("");
  const [otherBenefits, setOtherBenefits] = useState("");

  const [expectedBenefits, setExpectedBenefits] = useState<string[]>([]);
  const [expectedLivestock, setExpectedLivestock] = useState<string[]>([]);
  const [expectedAgricultureDetails, setExpectedAgricultureDetails] =
    useState("");
  const [expectedOtherBenefits, setExpectedOtherBenefits] = useState("");

  const [receivedDate, setReceivedDate] = useState("");
  const [amount, setAmount] = useState("");
  const [providingOrganization, setProvidingOrganization] = useState("");

  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function updateFamilyMember(
    index: number,
    field: keyof FamilyMember,
    value: string
  ) {
    setFamilyMembers((current) =>
      current.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    );
  }

  function addFamilyMember() {
    setFamilyMembers((current) => [...current, createFamilyMember()]);
  }

  function removeFamilyMember(index: number) {
    setFamilyMembers((current) => current.filter((_, i) => i !== index));
  }

  function toggle(
    value: string,
    values: string[],
    setter: (items: string[]) => void
  ) {
    setter(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
    );
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    const form = formRef.current;
    if (!form) {
      setError("படிவத்தைத் திறக்க முடியவில்லை.");
      return;
    }

    setGeneratingPdf(true);
    setError("");

    try {
      const canvas = await html2canvas(form, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDocument) => {
          clonedDocument.querySelectorAll(".no-print").forEach((element) => {
            (element as HTMLElement).style.display = "none";
          });
        },
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const margin = 8;
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = pdfHeight - margin * 2;
      const sourcePageHeight = (contentHeight * canvas.width) / contentWidth;

      let sourceY = 0;
      let pageNumber = 0;

      while (sourceY < canvas.height) {
        const currentSourceHeight = Math.min(
          sourcePageHeight,
          canvas.height - sourceY
        );
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(currentSourceHeight);

        const context = pageCanvas.getContext("2d");
        if (!context) throw new Error("Could not prepare the PDF page.");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          currentSourceHeight,
          0,
          0,
          canvas.width,
          currentSourceHeight
        );

        if (pageNumber > 0) pdf.addPage();

        const pageImage = pageCanvas.toDataURL("image/jpeg", 0.98);
        const imageHeight =
          (pageCanvas.height * contentWidth) / pageCanvas.width;

        pdf.addImage(
          pageImage,
          "JPEG",
          margin,
          margin,
          contentWidth,
          imageHeight
        );

        sourceY += currentSourceHeight;
        pageNumber++;
      }

      pdf.save("Manmunai_West_Beneficiary_Form.pdf");
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("PDF உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  function renderBenefitsSection(
    sectionTitle: string,
    selected: string[],
    setSelected: (items: string[]) => void,
    selectedLivestock: string[],
    setSelectedLivestock: (items: string[]) => void,
    agricultureText: string,
    setAgricultureText: (value: string) => void,
    otherText: string,
    setOtherText: (value: string) => void,
    idPrefix: string
  ) {
    return (
      <fieldset className="benefit-fieldset" key={idPrefix}>
        <legend>{sectionTitle}</legend>

        <div className="benefit-grid">
          {BENEFIT_OPTIONS.map((benefit, index) => (
            <label className="check-option" key={benefit}>
              <input
                type="checkbox"
                checked={selected.includes(benefit)}
                onChange={() => toggle(benefit, selected, setSelected)}
              />
              {index + 1}. {benefit}
            </label>
          ))}
        </div>

        {selected.includes("விவசாயம் சார்ந்த நன்மைகள்") && (
          <div className="form-field">
            <label htmlFor={`${idPrefix}-agriculture`}>
              விவசாயம் சார்ந்த நன்மைகளின் விபரம்
            </label>
            <textarea
              id={`${idPrefix}-agriculture`}
              rows={2}
              required
              value={agricultureText}
              onChange={(e) => setAgricultureText(e.target.value)}
            />
          </div>
        )}

        {selected.includes("வாழ்வாதாரம்-கால்நடை") && (
          <div className="sub-options">
            <strong>கால்நடை வகைகள்:</strong>
            {livestockOptions.map((item) => (
              <label className="check-option" key={item}>
                <input
                  type="checkbox"
                  checked={selectedLivestock.includes(item)}
                  onChange={() =>
                    toggle(item, selectedLivestock, setSelectedLivestock)
                  }
                />
                {item}
              </label>
            ))}
          </div>
        )}

        {selected.includes("ஏனையவை") && (
          <div className="form-field">
            <label htmlFor={`${idPrefix}-other`}>
              ஏனைய நன்மைகளின் விபரம்
            </label>
            <textarea
              id={`${idPrefix}-other`}
              rows={2}
              required
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
            />
          </div>
        )}
      </fieldset>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (familyMembers.length === 0) {
      setError("குறைந்தது ஒரு குடும்ப அங்கத்தவரை உள்ளிடவும்.");
      return;
    }

    for (let i = 0; i < familyMembers.length; i++) {
      const member = familyMembers[i];
      const row = i + 1;

      if (!member.name.trim()) {
        setError(`${row}. அங்கத்தவரின் பெயரை உள்ளிடவும்.`);
        return;
      }
      if (!member.birthDate || calculateAge(member.birthDate) === null) {
        setError(`${row}. சரியான பிறந்த திகதியைத் தெரிவுசெய்யவும்.`);
        return;
      }
      if (!/^(?:[A-Za-z0-9]{10}|[A-Za-z0-9]{12})$/.test(member.nic)) {
        setError(
          `${row}. தே.அ.அ. இலக்கம் 10 அல்லது 12 எழுத்துகள்/இலக்கங்களைக் கொண்டிருக்க வேண்டும்.`
        );
        return;
      }
      if (!member.gender) {
        setError(`${row}. பாலைத் தெரிவுசெய்யவும்.`);
        return;
      }
      if (!member.occupation.trim()) {
        setError(`${row}. தொழிலை உள்ளிடவும்.`);
        return;
      }
      if (!member.relationship) {
        setError(`${row}. உறவுமுறையைத் தெரிவுசெய்யவும்.`);
        return;
      }
      if (
        member.relationship === "வேறு" &&
        !member.otherRelationship.trim()
      ) {
        setError(`${row}. மற்ற உறவுமுறையை உள்ளிடவும்.`);
        return;
      }
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("தொலைபேசி இலக்கம் 10 இலக்கங்களைக் கொண்டிருக்க வேண்டும்.");
      return;
    }
    if (!welfareReceiving) {
      setError("அரசாங்க நலன்புரி உதவி தொடர்பான பதிலைத் தெரிவுசெய்யவும்.");
      return;
    }
    if (
      welfareReceiving === "ஆம்" &&
      welfareSchemes.length === 0
    ) {
      setError("பெறும் நலன்புரி உதவித்திட்டங்களில் ஒன்றைத் தெரிவுசெய்யவும்.");
      return;
    }
    if (
      welfareReceiving === "ஆம்" &&
      welfareSchemes.includes("வேறு உதவித்திட்டம்") &&
      !otherWelfareScheme.trim()
    ) {
      setError("வேறு உதவித்திட்டத்தின் பெயரை உள்ளிடவும்.");
      return;
    }
    if (!gnDivision) {
      setError("கிராமசேவகர் பிரிவைத் தெரிவுசெய்யவும்.");
      return;
    }
    if (!homeAddress.trim()) {
      setError("வீட்டு முகவரியை உள்ளிடவும்.");
      return;
    }
    
    if (benefits.length === 0) {
      setError("பகுதி B-இல் குறைந்தது ஒரு நன்மையைத் தெரிவுசெய்யவும்.");
      return;
    }
    if (
      benefits.includes("வாழ்வாதாரம்-கால்நடை") &&
      livestock.length === 0
    ) {
      setError("பகுதி B-இல் கால்நடை வகைகளில் ஒன்றைத் தெரிவுசெய்யவும்.");
      return;
    }
    if (
      benefits.includes("விவசாயம் சார்ந்த நன்மைகள்") &&
      !agricultureDetails.trim()
    ) {
      setError("விவசாயம் சார்ந்த நன்மைகளின் விபரத்தை உள்ளிடவும்.");
      return;
    }
    if (benefits.includes("ஏனையவை") && !otherBenefits.trim()) {
      setError("பகுதி B-இல் ஏனைய நன்மைகளின் விபரத்தை உள்ளிடவும்.");
      return;
    }
    if (!receivedDate) {
      setError("பெற்ற திகதியைத் தெரிவுசெய்யவும்.");
      return;
    }
    if (amount.trim() === "" || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
      setError("சரியான உதவித்தொகையை ரூபாயில் உள்ளிடவும்.");
      return;
    }
    if (!providingOrganization.trim()) {
      setError("வழங்கிய அமைச்சு/நிறுவனம்/அமைப்பின் பெயரை உள்ளிடவும்.");
      return;
    }
    if (expectedBenefits.length === 0) {
      setError("பகுதி C-இல் எதிர்பார்க்கும் நன்மைகளில் ஒன்றைத் தெரிவுசெய்யவும்.");
      return;
    }
    if (
      expectedBenefits.includes("வாழ்வாதாரம்-கால்நடை") &&
      expectedLivestock.length === 0
    ) {
      setError("பகுதி C-இல் கால்நடை வகைகளில் ஒன்றைத் தெரிவுசெய்யவும்.");
      return;
    }
    if (
      expectedBenefits.includes("விவசாயம் சார்ந்த நன்மைகள்") &&
      !expectedAgricultureDetails.trim()
    ) {
      setError("பகுதி C-இல் விவசாய நன்மைகளின் விபரத்தை உள்ளிடவும்.");
      return;
    }
    if (
      expectedBenefits.includes("ஏனையவை") &&
      !expectedOtherBenefits.trim()
    ) {
      setError("பகுதி C-இல் ஏனைய நன்மைகளின் விபரத்தை உள்ளிடவும்.");
      return;
    }

    setSaving(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) {
        throw new Error("தயவுசெய்து முதலில் உள்நுழையவும்.");
      }

      const firstMember = familyMembers[0];
      const savedFamilyMembers = familyMembers.map((member) => ({
        ...member,
        name: member.name.trim(),
        nic: member.nic.trim(),
        occupation: member.occupation.trim(),
        relationship:
          member.relationship === "வேறு"
            ? member.otherRelationship.trim()
            : member.relationship,
        age: calculateAge(member.birthDate),
      }));

      const { error: saveError } = await supabase
        .from("beneficiaries")
        .insert({
          full_name: firstMember.name.trim(),
          nic: firstMember.nic.trim(),
          phone,
          gn_division: gnDivision,
          home_address: homeAddress.trim(),
          family_members: Number(familyMemberCount),
          family_details: savedFamilyMembers,
          welfare_receiving: welfareReceiving === "ஆம்",
          welfare_schemes:
            welfareReceiving === "ஆம்" ? welfareSchemes : [],
          other_welfare_scheme:
            welfareReceiving === "ஆம்" &&
            welfareSchemes.includes("வேறு உதவித்திட்டம்")
              ? otherWelfareScheme.trim()
              : null,
          benefits,
          livestock: benefits.includes("வாழ்வாதாரம்-கால்நடை")
            ? livestock
            : [],
          agriculture_details: benefits.includes("விவசாயம் சார்ந்த நன்மைகள்")
            ? agricultureDetails.trim()
            : null,
          other_benefits: benefits.includes("ஏனையவை")
            ? otherBenefits.trim()
            : null,
          expected_benefits: expectedBenefits,
          expected_livestock: expectedBenefits.includes("வாழ்வாதாரம்-கால்நடை")
            ? expectedLivestock
            : [],
          expected_agriculture_details: expectedBenefits.includes(
            "விவசாயம் சார்ந்த நன்மைகள்"
          )
            ? expectedAgricultureDetails.trim()
            : null,
          expected_other_benefits: expectedBenefits.includes("ஏனையவை")
            ? expectedOtherBenefits.trim()
            : null,
          received_date: receivedDate,
          amount_rupees: Number(amount),
          providing_organization: providingOrganization.trim(),
          created_by: authData.user.id,
        });

      if (saveError) {
        console.error("Supabase insert error:", saveError);
        throw saveError;
      }

      alert("பயனாளியின் விபரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன.");

      setFamilyMembers([createFamilyMember()]);
      setPhone("");
      setWelfareReceiving("");
      setWelfareSchemes([]);
      setOtherWelfareScheme("");
      setGnDivision("");
      setHomeAddress("");
      setFamilyMemberCount("");
      setBenefits([]);
      setLivestock([]);
      setAgricultureDetails("");
      setOtherBenefits("");
      setExpectedBenefits([]);
      setExpectedLivestock([]);
      setExpectedAgricultureDetails("");
      setExpectedOtherBenefits("");
      setReceivedDate("");
      setAmount("");
      setProvidingOrganization("");
      setError("");
      onSaved();
    } catch (err) {
      console.error("Beneficiary save error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "விபரங்களை சேமிக்க முடியவில்லை."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page">
      <div className="page-actions no-print">
        <button type="button" onClick={handlePrint}>
          Print
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={generatingPdf || saving}
        >
          {generatingPdf ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      <form ref={formRef} className="a4-form" onSubmit={handleSubmit}>
        <h2 className="form-title">
          மண்முனை மேற்கு பிரதேச செயலக பிரிவின் பயனாளிகள் பெற்றுக்கொண்ட மற்றும்
          பெற்றுக்கொள்ள எதிர்பார்க்கும் நன்மைகள் தொடர்பான விபரத்திரட்டு.
        </h2>

        <section className="form-section section-a">

        <h3 className="section-heading">பகுதி A - அடிப்படை தகவல்கள்</h3>

        <h4 className="family-table-title">1. குடும்ப விபரம்</h4>

        <div className="family-table-wrapper">
          <table className="family-table">
            <thead>
              <tr>
                <th>இல.</th>
                <th>அங்கத்தவர் பெயர்</th>
                <th>பிறந்த திகதி</th>
                <th>தே.அ.அ. இல.</th>
                <th>பால்</th>
                <th>தொழில்</th>
                <th>உறவுமுறை</th>
                <th className="no-print">செயல்</th>
              </tr>
            </thead>
            <tbody>
              {familyMembers.map((member, index) => {
                const age = calculateAge(member.birthDate);
                return (
                  <tr key={index}>
                    <td className="member-number">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        aria-label={`அங்கத்தவர் ${index + 1} பெயர்`}
                        value={member.name}
                        required
                        onChange={(e) =>
                          updateFamilyMember(
                            index,
                            "name",
                            e.target.value.replace(/[^\p{L}\p{M}\s.]/gu, "")
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        aria-label={`அங்கத்தவர் ${index + 1} பிறந்த திகதி`}
                        value={member.birthDate}
                        max={new Date().toLocaleDateString("en-CA")}
                        required
                        onChange={(e) =>
                          updateFamilyMember(index, "birthDate", e.target.value)
                        }
                      />
                      <div className="age-display">
                        (வயது-{age === null ? "" : age})
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        aria-label={`அங்கத்தவர் ${index + 1} தேசிய அடையாள அட்டை இலக்கம்`}
                        value={member.nic}
                        maxLength={12}
                        minLength={10}
                        required
                        pattern="([A-Za-z0-9]{10}|[A-Za-z0-9]{12})"
                        title="10 அல்லது 12 எழுத்துகள்/இலக்கங்களை உள்ளிடவும்"
                        onChange={(e) =>
                          updateFamilyMember(
                            index,
                            "nic",
                            e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)
                          )
                        }
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`அங்கத்தவர் ${index + 1} பால்`}
                        value={member.gender}
                        required
                        onChange={(e) =>
                          updateFamilyMember(index, "gender", e.target.value)
                        }
                      >
                        <option value=""></option>
                        <option value="ஆண்">ஆண்</option>
                        <option value="பெண்">பெண்</option>
                        <option value="வேறு">வேறு</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        aria-label={`அங்கத்தவர் ${index + 1} தொழில்`}
                        value={member.occupation}
                        required
                        onChange={(e) =>
                          updateFamilyMember(index, "occupation", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`அங்கத்தவர் ${index + 1} உறவுமுறை`}
                        value={member.relationship}
                        required
                        onChange={(e) => {
                          updateFamilyMember(index, "relationship", e.target.value);
                          if (e.target.value !== "வேறு") {
                            updateFamilyMember(index, "otherRelationship", "");
                          }
                        }}
                      >
                        <option value=""></option>
                        <option value="தந்தை">தந்தை</option>
                        <option value="தாய்">தாய்</option>
                        <option value="மகன்">மகன்</option>
                        <option value="மகள்">மகள்</option>
                        <option value="வேறு">வேறு</option>
                      </select>
                      {member.relationship === "வேறு" && (
                        <input
                          className="other-relationship"
                          type="text"
                          aria-label="மற்ற உறவுமுறை"
                          placeholder="உறவுமுறை"
                          value={member.otherRelationship}
                          required
                          onChange={(e) =>
                            updateFamilyMember(
                              index,
                              "otherRelationship",
                              e.target.value.replace(/[^\p{L}\p{M}\s.]/gu, "")
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="no-print">
                      <button
                        type="button"
                        className="remove-member-button"
                        disabled={familyMembers.length === 1}
                        onClick={() => removeFamilyMember(index)}
                      >
                        நீக்கு
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="family-table-actions no-print">
          <button type="button" onClick={addFamilyMember}>
            + அங்கத்தவரைச் சேர்க்க
          </button>
        </div>

        <div className="form-field">
          <label htmlFor="phone">
            2. தொலைபேசி/கையடக்க தொலைபேசி இலக்கம்
          </label>
          <input
            id="phone"
            type="tel"
            required
            inputMode="numeric"
            maxLength={10}
            value={phone}
            pattern="[0-9]{10}"
            title="10 இலக்கங்களை உள்ளிடவும்"
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
          />
        </div>

        <div className="form-field">
          <span className="field-label">
            3. தற்போது அரசாங்க நலன்புரி உதவி திட்டத்தின் கீழ் ஏதேனும் உதவி
            பெறுபவர்களா?
          </span>
          <div className="radio-options">
            <label>
              <input
                type="radio"
                name="welfareReceiving"
                value="ஆம்"
                checked={welfareReceiving === "ஆம்"}
                onChange={() => setWelfareReceiving("ஆம்")}
              />
              ஆம்
            </label>
            <label>
              <input
                type="radio"
                name="welfareReceiving"
                value="இல்லை"
                checked={welfareReceiving === "இல்லை"}
                onChange={() => {
                  setWelfareReceiving("இல்லை");
                  setWelfareSchemes([]);
                  setOtherWelfareScheme("");
                }}
              />
              இல்லை
            </label>
          </div>

          {welfareReceiving === "ஆம்" && (
            <div className="sub-options">
              <strong>பெறும் உதவித்திட்டங்களைத் தெரிவுசெய்க:</strong>
              {WELFARE_OPTIONS.map((scheme) => (
                <label className="check-option" key={scheme}>
                  <input
                    type="checkbox"
                    checked={welfareSchemes.includes(scheme)}
                    onChange={() =>
                      toggle(scheme, welfareSchemes, setWelfareSchemes)
                    }
                  />
                  {scheme}
                </label>
              ))}

              {welfareSchemes.includes("வேறு உதவித்திட்டம்") && (
                <div className="form-field">
                  <label htmlFor="otherWelfareScheme">
                    வேறு உதவித்திட்டத்தின் பெயர்
                  </label>
                  <input
                    id="otherWelfareScheme"
                    type="text"
                    required
                    value={otherWelfareScheme}
                    onChange={(e) =>
                      setOtherWelfareScheme(
                        e.target.value.replace(/[^\p{L}\p{M}\s.'-]/gu, "")
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="gnDivision">4. கிராமசேவகர் பிரிவு</label>
          <select
            id="gnDivision"
            required
            value={gnDivision}
            onChange={(e) => setGnDivision(e.target.value)}
          >
            <option value=""></option>
            {gnDivisions.map((gn) => (
              <option key={gn} value={gn}>
                {gn}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="homeAddress">5. வீட்டு முகவரி</label>
          <textarea
            id="homeAddress"
            required
            rows={2}
            value={homeAddress}
            onChange={(e) => setHomeAddress(e.target.value)}
          />
        </div>
        </section>
        <section className="form-section section-b">

        
        <h3 className="section-heading">பகுதி B - பெற்ற நன்மையின் வகைகள்</h3>

        {renderBenefitsSection(
          "",
          benefits,
          setBenefits,
          livestock,
          setLivestock,
          agricultureDetails,
          setAgricultureDetails,
          otherBenefits,
          setOtherBenefits,
          "received"
        )}
        

        <div className="form-field">
          <label htmlFor="receivedDate">பெற்ற திகதி</label>
          <input
            id="receivedDate"
            type="date"
            required
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="amount">உதவித்தொகை (ரூபாய்)</label>
          <input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="providingOrganization">
            வழங்கிய அமைச்சு/நிறுவனம்/அமைப்பு
          </label>
          <input
            id="providingOrganization"
            type="text"
            required
            value={providingOrganization}
            onChange={(e) => setProvidingOrganization(e.target.value)}
          />
        </div>
        </section>
        <section className="form-section section-c">

        <h3 className="section-heading">
          பகுதி C - பெற்றுக்கொள்ள எதிர்பார்க்கும் நன்மைகள்
        </h3>

        {renderBenefitsSection(
          "",
          expectedBenefits,
          setExpectedBenefits,
          expectedLivestock,
          setExpectedLivestock,
          expectedAgricultureDetails,
          setExpectedAgricultureDetails,
          expectedOtherBenefits,
          setExpectedOtherBenefits,
          "expected"
        )}
        </section>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions no-print">
          <button
            type="submit"
            disabled={saving || generatingPdf}
          >
            {saving ? "சேமிக்கப்படுகிறது..." : "Submit"}
          </button>
        </div>
      </form>
    </section>
  );
}

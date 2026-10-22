import CertificateRequestsPanel from "../../components/reports/CertificateRequestsPanel";

export default function AdminCertificates() {
  return (
    <CertificateRequestsPanel
      showClassTeacher
      description="All certificate requests across the school. The class teacher decides first; the HM can approve or reject any request that is still pending."
    />
  );
}

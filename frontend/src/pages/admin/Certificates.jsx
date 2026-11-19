import CertificateRequestsPanel from "../../components/reports/CertificateRequestsPanel";

export default function AdminCertificates() {
  return (
    <CertificateRequestsPanel
      showClassTeacher
      canPrint
      description="Requests approved by class teachers come here to print. Printing tells the student to collect the certificate from your office."
    />
  );
}

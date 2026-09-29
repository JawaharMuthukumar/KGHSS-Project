import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { notices } from "../../data/schoolData";
import { formatDate } from "../../utils/formatDate";

const categoryTone = { Important: "gold", Academic: "teal", Event: "navy", General: "navy" };

export default function NoticeBoardPreview() {
  return (
    <section className="py-20 sm:py-28 bg-sky/60">
      <Container className="max-w-4xl mx-auto">
        <SectionHeading
          eyebrow="Notice Board"
          title="Stay informed."
          align="center"
          description="The latest announcements from school administration."
        />
        <Reveal className="mt-10 bg-white rounded-3xl border border-navy/8 shadow-soft divide-y divide-navy/8">
          {notices.slice(0, 5).map((notice) => (
            <div key={notice.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-6 py-5">
              <span className="text-xs font-semibold text-ink/45 w-24 shrink-0">{formatDate(notice.date)}</span>
              <Badge tone={categoryTone[notice.category] || "navy"} className="shrink-0">{notice.category}</Badge>
              <p className="text-sm font-medium text-navy flex-1">{notice.title}</p>
              <Icon name="FileText" size={17} className="text-ink/30 shrink-0" />
            </div>
          ))}
        </Reveal>
        <div className="flex justify-center mt-8">
          <Button to="/notices" variant="outlineDark">View all notices</Button>
        </div>
      </Container>
    </section>
  );
}

import Container from "../ui/Container";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Icon from "../ui/Icon";
import { headmaster } from "../../data/schoolData";

export default function HeadmasterMessage() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Reveal className="relative bg-heritage-noise rounded-3xl p-8 sm:p-12 lg:p-16 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
          <div className="relative grid lg:grid-cols-[auto_1fr] gap-10 items-center">
            <div className="flex flex-col items-center gap-4 mx-auto lg:mx-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/10 border-2 border-gold/40 flex items-center justify-center">
                <Icon name="UserRound" size={56} className="text-gold-light" strokeWidth={1.3} />
              </div>
              <div className="text-center">
                <p className="text-white font-heading font-bold">{headmaster.name}</p>
                <p className="text-xs text-white/60">Headmaster</p>
              </div>
            </div>

            <div>
              <Icon name="Quote" size={30} className="text-gold-light/70 mb-4" />
              <p className="text-white/90 text-lg sm:text-xl leading-relaxed text-balance mb-6">
                “{headmaster.message.short}”
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button to="/about/headmaster" variant="outline">
                  Read Headmaster's Message
                </Button>
                {headmaster.message.isSample && <Badge tone="sample">Sample message — editable</Badge>}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

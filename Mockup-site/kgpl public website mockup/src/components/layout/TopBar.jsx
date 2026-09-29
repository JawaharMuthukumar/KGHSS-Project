import Icon from "../ui/Icon";
import { schoolInfo } from "../../data/schoolData";

export default function TopBar() {
  const { contact, location } = schoolInfo;
  return (
    <div className="hidden lg:block bg-navy-dark text-white/80 text-xs">
      <div className="container-page flex items-center justify-between py-2">
        <div className="flex items-center gap-6">
          <a href={`tel:${contact.phonePrimary.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-gold-light transition-colors">
            <Icon name="Phone" size={13} />
            {contact.phonePrimary}
          </a>
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-gold-light transition-colors">
            <Icon name="Mail" size={13} />
            {contact.email}
          </a>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="MapPin" size={13} />
          <span>{location.village}, {location.block}, {location.district}</span>
        </div>
      </div>
    </div>
  );
}

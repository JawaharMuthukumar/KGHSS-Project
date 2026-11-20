import Hero from "../components/sections/Hero";
import QuickStats from "../components/sections/QuickStats";
import Introduction from "../components/sections/Introduction";
import AcademicsPreview from "../components/sections/AcademicsPreview";
import AchievementsPreview from "../components/sections/AchievementsPreview";
import NewsEvents from "../components/sections/NewsEvents";
import HeadmasterMessage from "../components/sections/HeadmasterMessage";
import GalleryPreview from "../components/sections/GalleryPreview";
import LegacyTeaser from "../components/sections/LegacyTeaser";
import SEO from "../components/utility/SEO";

/*
 * The home page tells a first-time visitor the essentials and stops: who we are, what we teach, how students
 * do, what's happening, the HM's word, a look around, and the centenary. Everything else (facilities, sports,
 * clubs, notices, alumni & PTA, social links) has its own page in the menu — the sections that used to repeat
 * it here (WhyUs, ResultsSection, FacilitiesPreview, SportsPreview, ClubsSection, NoticeBoardPreview, AlumniPTA,
 * SocialSection, YoutubeSection) are kept in components/sections in case one is wanted back.
 * Alternate sections sit on the light sky band so neighbouring plain sections don't run together.
 */
const band = "bg-sky/60";

export default function Home() {
  return (
    <>
      <SEO
        title="Government Higher Secondary School, Kangayampalayam"
        description="Nearly a century of learning, character and community. Classes 6–12, Tamil & English medium, Coimbatore District, Tamil Nadu."
      />
      <Hero />
      <QuickStats />
      <Introduction />
      <div className={band}>
        <AcademicsPreview />
      </div>
      <AchievementsPreview />
      <div className={band}>
        <NewsEvents />
      </div>
      <HeadmasterMessage />
      <div className={band}>
        <GalleryPreview />
      </div>
      <LegacyTeaser />
    </>
  );
}

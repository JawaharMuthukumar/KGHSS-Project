import Hero from "../components/sections/Hero";
import QuickStats from "../components/sections/QuickStats";
import Introduction from "../components/sections/Introduction";
import WhyUs from "../components/sections/WhyUs";
import AcademicsPreview from "../components/sections/AcademicsPreview";
import ResultsSection from "../components/sections/ResultsSection";
import AchievementsPreview from "../components/sections/AchievementsPreview";
import FacilitiesPreview from "../components/sections/FacilitiesPreview";
import SportsPreview from "../components/sections/SportsPreview";
import ClubsSection from "../components/sections/ClubsSection";
import NewsEvents from "../components/sections/NewsEvents";
import NoticeBoardPreview from "../components/sections/NoticeBoardPreview";
import HeadmasterMessage from "../components/sections/HeadmasterMessage";
import GalleryPreview from "../components/sections/GalleryPreview";
import AlumniPTA from "../components/sections/AlumniPTA";
import SocialSection from "../components/sections/SocialSection";
import YoutubeSection from "../components/sections/YoutubeSection";
import LegacyTeaser from "../components/sections/LegacyTeaser";
import SEO from "../components/utility/SEO";

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
      <WhyUs />
      <AcademicsPreview />
      <ResultsSection />
      <AchievementsPreview />
      <FacilitiesPreview />
      <SportsPreview />
      <ClubsSection />
      <NewsEvents />
      <NoticeBoardPreview />
      <HeadmasterMessage />
      <GalleryPreview />
      <AlumniPTA />
      <SocialSection />
      <YoutubeSection />
      <LegacyTeaser />
    </>
  );
}

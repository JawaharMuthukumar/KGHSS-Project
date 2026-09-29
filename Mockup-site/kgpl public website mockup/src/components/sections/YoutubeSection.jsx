import Container from "../ui/Container";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../ui/Reveal";
import Icon from "../ui/Icon";
import ImagePlaceholder from "../ui/ImagePlaceholder";
import { youtubeVideos, schoolInfo } from "../../data/schoolData";

export default function YoutubeSection() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="From Our Channel"
          title="From Our YouTube Channel"
          description="Sample video placeholders shown below — replace with real videos once available."
        />
        <div className="mt-12 grid sm:grid-cols-3 gap-5">
          {youtubeVideos.map((video, i) => {
            const Wrapper = video.url ? "a" : "div";
            const wrapperProps = video.url
              ? { href: video.url, target: "_blank", rel: "noopener noreferrer" }
              : {};
            return (
              <Reveal key={video.title} delay={i * 0.08}>
                <Wrapper
                  {...wrapperProps}
                  className={`group block bg-white rounded-2xl border border-navy/8 shadow-soft overflow-hidden ${
                    video.url ? "cursor-pointer transition-shadow duration-300 hover:shadow-lift" : "opacity-90"
                  }`}
                >
                  <div className="relative h-44">
                    <ImagePlaceholder label={video.title} icon="PlayCircle" className="h-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white group-hover:bg-white/30 transition-colors">
                        <Icon name="PlayCircle" size={30} />
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold text-gold-dark uppercase tracking-wide">{video.category}</span>
                    <h3 className="font-heading font-semibold text-navy text-sm mt-1.5 mb-3">{video.title}</h3>
                    {video.url ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy">
                        Watch on YouTube <Icon name="ArrowUpRight" size={13} />
                      </span>
                    ) : (
                      <span className="text-xs text-ink/40">Video coming soon</span>
                    )}
                  </div>
                </Wrapper>
              </Reveal>
            );
          })}
        </div>
        <div className="flex justify-center mt-10">
          <a
            href={schoolInfo.socialMedia.youtube.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold-dark transition-colors"
          >
            <Icon name="Youtube" size={17} />
            Visit our full YouTube channel
          </a>
        </div>
      </Container>
    </section>
  );
}

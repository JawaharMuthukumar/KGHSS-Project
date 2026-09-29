import Container from "../components/ui/Container";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Reveal from "../components/ui/Reveal";
import SEO from "../components/utility/SEO";

export default function NotFound() {
  return (
    <section className="min-h-[70svh] flex items-center bg-heritage-noise text-white">
      <SEO title="Page Not Found" description="The page you're looking for could not be found." />
      <Container className="text-center flex flex-col items-center py-20">
        <Reveal>
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 border border-white/15 mb-6">
            <Icon name="School" size={36} className="text-gold-light" />
          </span>
          <p className="text-6xl sm:text-7xl font-heading font-extrabold text-gold-light mb-3">404</p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">This page couldn't be found.</h1>
          <p className="text-white/70 max-w-md mx-auto mb-8">
            The page you're looking for may have moved or doesn't exist. Let's get you back to
            familiar ground.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button to="/" variant="primary" size="lg" icon="Home">Back to Home</Button>
            <Button to="/contact" variant="outline" size="lg">Contact Us</Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

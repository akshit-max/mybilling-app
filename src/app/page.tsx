import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marketing from "@/components/Marketing";
import Testimonials from "@/components/Testimonials";
import FeaturesGrid from "@/components/FeaturesGrid";
import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import Review from "@/components/Review";


export default function Home() {
  return (
    <>
    
      <Navbar />
      <Hero />
      <Review />
      <Marketing />
      <Testimonials />
      <FeaturesGrid />
      <CTA />
      <FAQ />
      <Footer />
    </>
  );
}
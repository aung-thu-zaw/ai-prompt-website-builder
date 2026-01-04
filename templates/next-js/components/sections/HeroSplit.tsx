import { Button } from "@/components/ui/button";
interface HeroSplitProps {
  title: string;
  subtitle: string;
}

const HeroSplit = ({ title, subtitle }: HeroSplitProps) => {
  return (
    <>
      <section className="bg-white dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center min-h-[460px] py-12 lg:py-24 gap-12">
          {/* Left side: text */}
          <div className="w-full lg:w-1/2 flex flex-col items-start justify-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
            {/* Optional: CTA */}
            <Button variant="default" className="mt-8">
              Get Started
            </Button>
          </div>
          {/* Right side: image/illustration */}
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            {/* Placeholder: Replace with actual image */}
            <div className="w-full max-w-md h-64 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
              <span className="text-gray-400 dark:text-gray-600">
                [Your Product Visual]
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSplit;

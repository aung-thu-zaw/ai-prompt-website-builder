interface HeroProps {
  title: string;
  subtitle: string;
}

const HeroDefault = ({ title, subtitle }: HeroProps) => {
  return (
    <>
      <section className="bg-white dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-16 sm:py-24 lg:py-32">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroDefault;

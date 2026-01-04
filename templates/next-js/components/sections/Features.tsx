interface FeaturesProps {
  items: string[];
}

const Features = ({ items }: FeaturesProps) => {
  return (
    <>
      <section>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-16 sm:py-24 lg:py-32">
            <h2>Features</h2>
            <ul>
              {items.map((item: string) => (
                <li key={item}>
                  <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
};

export default Features;
